const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('createCompletedSale creates sale, deducts inventory, and records payment', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/INSERT INTO sales/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '70',
              customer_id: params[0],
              branch_id: params[1],
              status: 'completed',
              subtotal: params[2],
              discount_amount: params[3],
              tax_amount: params[4],
              total_amount: params[5],
              paid_amount: params[6],
              balance_amount: params[7],
              payment_status: 'paid',
              created_by: params[8],
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/INSERT INTO sale_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '90',
              sale_id: params[0],
              product_id: params[1],
              variant_id: params[2],
              quantity: params[3],
              unit_price: params[4],
              discount_amount: params[5],
              line_total: params[6],
            },
          ],
        };
      }

      if (/INSERT INTO sale_payments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '71',
              sale_id: params[0],
              amount: params[1],
              method: params[2],
              reference_number: params[3],
              notes: params[4],
              paid_at: params[5],
              created_by: params[6],
              created_at: new Date('2026-05-10T00:00:30.000Z'),
            },
          ],
        };
      }

      if (/FROM inventory/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '30',
              product_id: params[0],
              variant_id: params[2],
              branch_id: params[1],
              quantity: 8,
            },
          ],
        };
      }

      if (/UPDATE inventory/.test(sql)) {
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
              variant_id: params[2],
              branch_id: params[3],
              previous_quantity: params[4],
              new_quantity: params[5],
              quantity_change: params[6],
              reason: params[7],
              adjusted_by_user_id: params[8],
              created_at: new Date('2026-05-10T00:01:00.000Z'),
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

  const sale = await saleService.createCompletedSale(
    { id: 42 },
    {
      customerId: '1',
      branchId: '2',
      discountAmount: '1.00',
      taxAmount: '0.50',
      paidAmount: '18.50',
      paymentMethod: 'cash',
      paymentReferenceNumber: 'RCPT-70',
      items: [
        {
          productId: '10',
          variantId: '5',
          quantity: '2',
          unitPrice: '9.50',
        },
      ],
    }
  );

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
      'COMMIT',
    ]
  );
  assert.deepEqual(queries[1].params, [1, 2, 19, 1, 0.5, 18.5, 18.5, 0, 42]);
  assert.match(queries[2].sql, /INSERT INTO sale_payments/);
  assert.equal(queries[2].params[0], '70');
  assert.equal(queries[2].params[1], 18.5);
  assert.equal(queries[2].params[2], 'cash');
  assert.equal(queries[2].params[3], 'RCPT-70');
  assert.equal(queries[2].params[6], 42);
  assert.match(queries[3].sql, /INSERT INTO sale_items/);
  assert.deepEqual(queries[3].params, ['70', 10, 5, 2, 9.5, 0, 19]);
  assert.match(queries[4].sql, /FOR UPDATE/);
  assert.deepEqual(queries[4].params, [10, 2, 5]);
  assert.deepEqual(queries[5].params, ['30', 6]);
  assert.deepEqual(queries[6].params, [
    '30',
    10,
    5,
    2,
    8,
    6,
    -2,
    'Sale 70 completed',
    42,
  ]);
  assert.equal(sale.status, 'completed');
  assert.equal(sale.totalAmount, 18.5);
  assert.equal(sale.payment.amount, 18.5);
  assert.equal(sale.payment.method, 'cash');
  assert.equal(sale.inventoryAdjustments[0].quantityChange, -2);
});

test('createCompletedSale rejects insufficient stock and rolls back', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/INSERT INTO sales/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '70',
              customer_id: null,
              branch_id: params[1],
              status: 'completed',
              subtotal: params[2],
              discount_amount: params[3],
              tax_amount: params[4],
              total_amount: params[5],
              paid_amount: params[6],
              balance_amount: params[7],
              payment_status: 'paid',
              created_by: params[8],
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/INSERT INTO sale_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '90',
              sale_id: params[0],
              product_id: params[1],
              variant_id: params[2],
              quantity: params[3],
              unit_price: params[4],
              discount_amount: params[5],
              line_total: params[6],
            },
          ],
        };
      }

      if (/INSERT INTO sale_payments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '71',
              sale_id: params[0],
              amount: params[1],
              method: params[2],
              reference_number: params[3],
              notes: params[4],
              paid_at: params[5],
              created_by: params[6],
              created_at: new Date('2026-05-10T00:00:30.000Z'),
            },
          ],
        };
      }

      if (/FROM inventory/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '30',
              product_id: params[0],
              variant_id: null,
              branch_id: params[1],
              quantity: 1,
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
      saleService.createCompletedSale(
        { id: 42 },
        {
          branchId: '2',
          paidAmount: '19.00',
          items: [{ productId: '10', quantity: '2', unitPrice: '9.50' }],
        }
      ),
    {
      statusCode: 400,
      message: 'Insufficient stock for sale item.',
    }
  );

  assert.equal(queries.some(({ sql }) => /UPDATE inventory/.test(sql)), false);
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});

test('createCompletedSale rejects underpayment before opening a transaction', {
  skip: !dependenciesAvailable,
}, async () => {
  const saleService = require('../src/services/saleService');

  await assert.rejects(
    () =>
      saleService.createCompletedSale(null, {
        branchId: '2',
        paidAmount: '10.00',
        items: [{ productId: '10', quantity: '2', unitPrice: '9.50' }],
      }),
    {
      statusCode: 400,
      message: 'Paid amount must cover the completed sale total.',
    }
  );
});
