const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll lists inventory with low-stock alert flags', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalQuery = database.query;
  let selectSql;
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    selectSql = sql;
    selectParams = params;

    return {
      rowCount: 2,
      rows: [
        {
          id: '1',
          product_id: '10',
          variant_id: null,
          branch_id: '3',
          quantity: 4,
          last_updated: new Date('2026-05-01T00:00:00.000Z'),
          reorder_level: 5,
          product_name: 'Coffee',
          product_sku: 'COFFEE',
          product_barcode: null,
          product_status: 'active',
          variant_name: null,
          variant_sku: null,
          variant_barcode: null,
          variant_status: null,
          branch_name: 'Downtown',
          branch_status: 'active',
        },
        {
          id: '2',
          product_id: '11',
          variant_id: '21',
          branch_id: '3',
          quantity: 8,
          last_updated: new Date('2026-05-01T00:00:00.000Z'),
          reorder_level: 5,
          product_name: 'Tea',
          product_sku: 'TEA',
          product_barcode: null,
          product_status: 'active',
          variant_name: 'Large',
          variant_sku: 'TEA-L',
          variant_barcode: null,
          variant_status: 'active',
          branch_name: 'Downtown',
          branch_status: 'active',
        },
      ],
    };
  };

  const inventory = await inventoryService.findAll();

  assert.match(selectSql, /FROM inventory/);
  assert.match(
    selectSql,
    /COALESCE\(product_variants\.reorder_level, products\.reorder_level\)/
  );
  assert.match(selectSql, /products\.deleted_at IS NULL/);
  assert.match(selectSql, /branches\.deleted_at IS NULL/);
  assert.deepEqual(selectParams, []);
  assert.equal(inventory[0].lowStockAlert, true);
  assert.equal(inventory[0].reorderLevel, 5);
  assert.equal(inventory[0].variant, null);
  assert.equal(inventory[1].lowStockAlert, false);
  assert.equal(inventory[1].variant.sku, 'TEA-L');
});

test('findAll filters inventory by branch id', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalQuery = database.query;
  let selectSql;
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    selectSql = sql;
    selectParams = params;

    return { rowCount: 0, rows: [] };
  };

  await inventoryService.findAll({ branchId: '7' });

  assert.match(selectSql, /inventory\.branch_id = \$1/);
  assert.deepEqual(selectParams, [7]);
});

test('findLowStock lists inventory below reorder level', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalQuery = database.query;
  let selectSql;
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    selectSql = sql;
    selectParams = params;

    return {
      rowCount: 1,
      rows: [
        {
          id: '1',
          product_id: '10',
          variant_id: null,
          branch_id: '3',
          quantity: 4,
          last_updated: new Date('2026-05-01T00:00:00.000Z'),
          reorder_level: 5,
          product_name: 'Coffee',
          product_sku: 'COFFEE',
          product_barcode: null,
          product_status: 'active',
          variant_name: null,
          variant_sku: null,
          variant_barcode: null,
          variant_status: null,
          branch_name: 'Downtown',
          branch_status: 'active',
        },
      ],
    };
  };

  const inventory = await inventoryService.findLowStock({ branch_id: '3' });

  assert.match(
    selectSql,
    /inventory\.quantity < COALESCE\(product_variants\.reorder_level, products\.reorder_level\)/
  );
  assert.match(selectSql, /inventory\.branch_id = \$1/);
  assert.deepEqual(selectParams, [3]);
  assert.equal(inventory[0].lowStockAlert, true);
  assert.equal(inventory[0].product.name, 'Coffee');
});

test('findExpiring lists inventory with products expiring within threshold', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalQuery = database.query;
  let selectSql;
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    selectSql = sql;
    selectParams = params;

    return {
      rowCount: 1,
      rows: [
        {
          id: '1',
          product_id: '10',
          variant_id: null,
          branch_id: '3',
          quantity: 4,
          last_updated: new Date('2026-05-01T00:00:00.000Z'),
          reorder_level: 5,
          product_name: 'Milk',
          product_sku: 'MILK',
          product_barcode: null,
          product_status: 'active',
          product_expiry_date: '2026-05-15',
          days_until_expiry: 5,
          variant_name: null,
          variant_sku: null,
          variant_barcode: null,
          variant_status: null,
          branch_name: 'Downtown',
          branch_status: 'active',
        },
      ],
    };
  };

  const inventory = await inventoryService.findExpiring({
    branchId: '3',
    thresholdDays: '14',
  });

  assert.match(selectSql, /products\.expiry_date IS NOT NULL/);
  assert.match(selectSql, /products\.expiry_date >= CURRENT_DATE/);
  assert.match(
    selectSql,
    /products\.expiry_date <= CURRENT_DATE \+ \(\$2::integer \* INTERVAL '1 day'\)/
  );
  assert.match(selectSql, /products\.expiry_date AS product_expiry_date/);
  assert.match(selectSql, /products\.expiry_date - CURRENT_DATE AS days_until_expiry/);
  assert.match(selectSql, /inventory\.branch_id = \$1/);
  assert.deepEqual(selectParams, [3, 14]);
  assert.equal(inventory[0].product.expiryDate, '2026-05-15');
  assert.equal(inventory[0].product.daysUntilExpiry, 5);
});

test('findMovements lists stock movements with filters', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalQuery = database.query;
  let selectSql;
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    selectSql = sql;
    selectParams = params;

    return {
      rowCount: 1,
      rows: [
        {
          id: '99',
          inventory_id: '1',
          product_id: '10',
          variant_id: '20',
          branch_id: '3',
          previous_quantity: 4,
          new_quantity: 7,
          quantity_change: 3,
          reason: 'Cycle count correction',
          adjusted_by_user_id: '42',
          created_at: new Date('2026-05-02T00:00:00.000Z'),
          product_name: 'Coffee',
          product_sku: 'COFFEE',
          product_barcode: null,
          product_status: 'active',
          variant_name: 'Large',
          variant_sku: 'COFFEE-L',
          variant_barcode: null,
          variant_status: 'active',
          branch_name: 'Downtown',
          branch_status: 'active',
          adjusted_by_user_name: 'Manager',
          adjusted_by_user_email: 'manager@example.com',
        },
      ],
    };
  };

  const movements = await inventoryService.findMovements({
    inventoryId: '1',
    branch_id: '3',
    dateFrom: '2026-05-01',
    date_to: '2026-05-03',
    limit: '10',
    offset: '5',
  });

  assert.match(selectSql, /FROM inventory_adjustments/);
  assert.match(selectSql, /inventory_adjustments\.inventory_id = \$1/);
  assert.match(selectSql, /inventory_adjustments\.branch_id = \$2/);
  assert.match(selectSql, /inventory_adjustments\.created_at >= \$3/);
  assert.match(selectSql, /inventory_adjustments\.created_at <= \$4/);
  assert.match(selectSql, /ORDER BY inventory_adjustments\.created_at DESC/);
  assert.match(selectSql, /LIMIT \$5 OFFSET \$6/);
  assert.deepEqual(selectParams, [1, 3, '2026-05-01', '2026-05-03', 10, 5]);
  assert.equal(movements[0].quantityChange, 3);
  assert.equal(movements[0].product.sku, 'COFFEE');
  assert.equal(movements[0].variant.sku, 'COFFEE-L');
  assert.equal(movements[0].branch.name, 'Downtown');
  assert.equal(movements[0].adjustedBy.email, 'manager@example.com');
});

test('adjustStock updates inventory quantity and logs reason', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/SELECT inventory\.id/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '1',
              product_id: '10',
              variant_id: null,
              branch_id: '3',
              quantity: 4,
              last_updated: new Date('2026-05-01T00:00:00.000Z'),
              reorder_level: 5,
              product_name: 'Coffee',
              product_sku: 'COFFEE',
              product_barcode: null,
              product_status: 'active',
              variant_name: null,
              variant_sku: null,
              variant_barcode: null,
              variant_status: null,
              branch_name: 'Downtown',
              branch_status: 'active',
            },
          ],
        };
      }

      if (/UPDATE inventory/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{ last_updated: new Date('2026-05-02T00:00:00.000Z') }],
        };
      }

      if (/INSERT INTO inventory_adjustments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '99',
              inventory_id: '1',
              product_id: '10',
              variant_id: null,
              branch_id: '3',
              previous_quantity: 4,
              new_quantity: 7,
              quantity_change: 3,
              reason: params[7],
              adjusted_by_user_id: params[8],
              created_at: new Date('2026-05-02T00:00:00.000Z'),
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

  const result = await inventoryService.adjustStock(
    { id: 42 },
    {
      inventoryId: '1',
      quantityChange: '3',
      reason: ' Cycle count correction ',
    }
  );

  assert.deepEqual(
    queries.map(({ sql }) => sql),
    [
      'BEGIN',
      queries[1].sql,
      queries[2].sql,
      queries[3].sql,
      'COMMIT',
    ]
  );
  assert.match(queries[1].sql, /FOR UPDATE OF inventory/);
  assert.deepEqual(queries[2].params, [1, 7]);
  assert.deepEqual(queries[3].params, [
    1,
    '10',
    null,
    '3',
    4,
    7,
    3,
    'Cycle count correction',
    42,
  ]);
  assert.equal(result.inventory.quantity, 7);
  assert.equal(result.adjustment.previousQuantity, 4);
  assert.equal(result.adjustment.newQuantity, 7);
  assert.equal(result.adjustment.reason, 'Cycle count correction');
});

test('adjustStock rejects adjustments that would make stock negative', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const inventoryService = require('../src/services/inventoryService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/SELECT inventory\.id/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '1',
              product_id: '10',
              variant_id: null,
              branch_id: '3',
              quantity: 2,
              last_updated: new Date('2026-05-01T00:00:00.000Z'),
              reorder_level: 5,
              product_name: 'Coffee',
              product_sku: 'COFFEE',
              product_barcode: null,
              product_status: 'active',
              variant_name: null,
              variant_sku: null,
              variant_barcode: null,
              variant_status: null,
              branch_name: 'Downtown',
              branch_status: 'active',
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

  await assert.rejects(
    () =>
      inventoryService.adjustStock(
        { id: 42 },
        { inventoryId: '1', adjustment: '-3', reason: 'Waste' }
      ),
    {
      statusCode: 400,
      message: 'Stock quantity cannot be negative.',
    }
  );

  assert.equal(queries.some(({ sql }) => /UPDATE inventory/.test(sql)), false);
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});
