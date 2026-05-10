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
