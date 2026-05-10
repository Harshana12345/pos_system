const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('createPurchaseOrder inserts order and line items in a transaction', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/INSERT INTO purchase_orders/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '50',
              supplier_id: '1',
              branch_id: '2',
              status: params[2],
              total_amount: params[3],
              notes: params[4],
              created_by: params[5],
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/INSERT INTO purchase_order_items/.test(sql)) {
        return {
          rowCount: 2,
          rows: [
            {
              id: '80',
              purchase_order_id: params[0],
              product_id: params[1],
              quantity: params[2],
              cost_price: params[3],
            },
            {
              id: '81',
              purchase_order_id: params[4],
              product_id: params[5],
              quantity: params[6],
              cost_price: params[7],
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  const purchase = await purchaseService.createPurchaseOrder(
    { id: 42 },
    {
      supplierId: '1',
      branchId: '2',
      status: 'ordered',
      notes: ' Weekly order ',
      items: [
        { productId: '10', quantity: '2', costPrice: '5.25' },
        { product_id: '11', quantity: '3', cost_price: '4.50' },
      ],
    }
  );

  assert.deepEqual(
    queries.map(({ sql }) => sql),
    ['BEGIN', queries[1].sql, queries[2].sql, 'COMMIT']
  );
  assert.match(queries[1].sql, /INSERT INTO purchase_orders/);
  assert.deepEqual(queries[1].params, [1, 2, 'ordered', 24, 'Weekly order', 42]);
  assert.match(queries[2].sql, /\(\$1, \$2, \$3, \$4\), \(\$5, \$6, \$7, \$8\)/);
  assert.deepEqual(queries[2].params, ['50', 10, 2, 5.25, '50', 11, 3, 4.5]);
  assert.equal(purchase.totalAmount, 24);
  assert.equal(purchase.createdBy, 42);
  assert.equal(purchase.items[0].lineTotal, 10.5);
  assert.equal(purchase.items[1].lineTotal, 13.5);
});

test('createPurchaseOrder rolls back and maps missing product references', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/INSERT INTO purchase_orders/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '50',
              supplier_id: '1',
              branch_id: '2',
              status: params[2],
              total_amount: params[3],
              notes: params[4],
              created_by: params[5],
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/INSERT INTO purchase_order_items/.test(sql)) {
        const error = new Error('violates foreign key constraint');

        error.code = '23503';
        error.constraint = 'purchase_order_items_product_id_fkey';
        throw error;
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  await assert.rejects(
    () =>
      purchaseService.createPurchaseOrder(
        { id: 42 },
        {
          supplierId: '1',
          branchId: '2',
          items: [{ productId: '99', quantity: '1', costPrice: '2.00' }],
        }
      ),
    {
      statusCode: 404,
      message: 'Product not found.',
    }
  );

  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});

test('approvePurchaseOrder approves a pending order in a transaction', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM purchase_orders/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'draft',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/UPDATE purchase_orders/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'ordered',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/FROM purchase_order_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '80',
              purchase_order_id: params[0],
              product_id: '10',
              quantity: '2',
              received_quantity: '0',
              cost_price: '5.00',
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  const purchase = await purchaseService.approvePurchaseOrder(50);

  assert.deepEqual(
    queries.map(({ sql }) => sql),
    ['BEGIN', queries[1].sql, queries[2].sql, queries[3].sql, 'COMMIT']
  );
  assert.match(queries[1].sql, /FOR UPDATE/);
  assert.match(queries[2].sql, /SET status = 'ordered'/);
  assert.equal(purchase.status, 'ordered');
  assert.equal(purchase.items[0].lineTotal, 10);
});

test('approvePurchaseOrder rejects non-pending orders', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM purchase_orders/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'received',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  await assert.rejects(() => purchaseService.approvePurchaseOrder(50), {
    statusCode: 400,
    message: 'Only pending purchase orders can be approved.',
  });

  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});

test('receivePurchaseOrder marks order received and updates inventory', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM purchase_orders/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'ordered',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/FROM purchase_order_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '80',
              purchase_order_id: params[0],
              product_id: '10',
              quantity: '2',
              received_quantity: '0',
              cost_price: '5.00',
            },
          ],
        };
      }

      if (/FROM inventory/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '90',
              product_id: params[0],
              variant_id: null,
              branch_id: params[1],
              quantity: 4,
            },
          ],
        };
      }

      if (/UPDATE inventory/.test(sql)) {
        return { rowCount: 1, rows: [] };
      }

      if (/UPDATE purchase_order_items/.test(sql)) {
        return { rowCount: 1, rows: [] };
      }

      if (/INSERT INTO inventory_adjustments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '99',
              inventory_id: params[0],
              product_id: params[1],
              variant_id: null,
              branch_id: params[2],
              previous_quantity: params[3],
              new_quantity: params[4],
              quantity_change: params[5],
              reason: params[6],
              adjusted_by_user_id: params[7],
              created_at: new Date('2026-05-10T01:00:00.000Z'),
            },
          ],
        };
      }

      if (/UPDATE purchase_orders/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: params[1],
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  const purchase = await purchaseService.receivePurchaseOrder({ id: 7 }, 50);

  assert.deepEqual(
    queries.map(({ sql }) => sql),
    [
      'BEGIN',
      queries[1].sql,
      queries[2].sql,
      queries[3].sql,
      queries[4].sql,
      queries[5].sql,
      queries[6].sql,
      queries[7].sql,
      'COMMIT',
    ]
  );
  assert.match(queries[3].sql, /FROM inventory/);
  assert.match(queries[3].sql, /FOR UPDATE/);
  assert.deepEqual(queries[3].params, ['10', '2']);
  assert.deepEqual(queries[4].params, ['90', 6]);
  assert.deepEqual(queries[5].params, [
    '90',
    '10',
    '2',
    4,
    6,
    2,
    'Purchase order 50 received',
    7,
  ]);
  assert.deepEqual(queries[6].params, ['80', 2]);
  assert.match(queries[7].sql, /SET status = \$2/);
  assert.deepEqual(queries[7].params, [50, 'received']);
  assert.equal(purchase.status, 'received');
  assert.equal(purchase.items[0].lineTotal, 10);
  assert.equal(purchase.items[0].receivedQuantity, 2);
  assert.equal(purchase.items[0].remainingQuantity, 0);
  assert.equal(purchase.inventoryAdjustments[0].previousQuantity, 4);
  assert.equal(purchase.inventoryAdjustments[0].newQuantity, 6);
  assert.equal(purchase.inventoryAdjustments[0].quantityChange, 2);
});

test('receivePurchaseOrder creates inventory rows for first receipt', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM purchase_orders/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'ordered',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/FROM purchase_order_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '80',
              purchase_order_id: params[0],
              product_id: '10',
              quantity: '2',
              received_quantity: '0',
              cost_price: '5.00',
            },
          ],
        };
      }

      if (/FROM inventory/.test(sql) && /FOR UPDATE/.test(sql)) {
        return { rowCount: 0, rows: [] };
      }

      if (/INSERT INTO inventory \(/.test(sql)) {
        return { rowCount: 1, rows: [{ id: '90' }] };
      }

      if (/INSERT INTO inventory_adjustments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '99',
              inventory_id: params[0],
              product_id: params[1],
              variant_id: null,
              branch_id: params[2],
              previous_quantity: params[3],
              new_quantity: params[4],
              quantity_change: params[5],
              reason: params[6],
              adjusted_by_user_id: params[7],
              created_at: new Date('2026-05-10T01:00:00.000Z'),
            },
          ],
        };
      }

      if (/UPDATE purchase_order_items/.test(sql)) {
        return { rowCount: 1, rows: [] };
      }

      if (/UPDATE purchase_orders/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: params[1],
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  const purchase = await purchaseService.receivePurchaseOrder({ id: 7 }, 50);
  const insertInventoryQuery = queries.find(({ sql }) => /INSERT INTO inventory \(/.test(sql));

  assert.deepEqual(insertInventoryQuery.params, ['10', '2', 2]);
  assert.equal(purchase.inventoryAdjustments[0].previousQuantity, 0);
  assert.equal(purchase.inventoryAdjustments[0].newQuantity, 2);
});

test('receivePurchaseOrder rejects non-ordered purchase orders', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const purchaseService = require('../src/services/purchaseService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM purchase_orders/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: params[0],
              supplier_id: '1',
              branch_id: '2',
              status: 'received',
              total_amount: '10.00',
              notes: null,
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  await assert.rejects(() => purchaseService.receivePurchaseOrder({ id: 7 }, 50), {
    statusCode: 400,
    message: 'Only ordered purchase orders can be received.',
  });

  assert.equal(queries.some(({ sql }) => /FROM inventory/.test(sql)), false);
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});
