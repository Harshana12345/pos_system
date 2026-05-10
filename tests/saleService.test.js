const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll filters sales by date range, cashier, branch, and status', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    return {
      rowCount: 1,
      rows: [
        {
          id: '70',
          customer_id: '1',
          branch_id: '2',
          status: 'completed',
          subtotal: '19.00',
          discount_amount: '1.00',
          tax_amount: '0.50',
          total_amount: '18.50',
          paid_amount: '18.50',
          balance_amount: '0.00',
          payment_status: 'paid',
          created_by: '42',
          created_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  const sales = await saleService.findAll({
    startDate: '2026-05-01',
    endDate: '2026-05-10T23:59:59.000Z',
    cashier: '42',
    branch_id: '2',
    status: 'completed',
  });

  assert.match(queries[0].sql, /FROM sales/);
  assert.match(queries[0].sql, /created_at >= \$1/);
  assert.match(queries[0].sql, /created_at <= \$2/);
  assert.match(queries[0].sql, /created_by = \$3/);
  assert.match(queries[0].sql, /branch_id = \$4/);
  assert.match(queries[0].sql, /status = \$5/);
  assert.match(queries[0].sql, /ORDER BY created_at DESC, id DESC/);
  assert.deepEqual(queries[0].params, [
    '2026-05-01',
    '2026-05-10T23:59:59.000Z',
    42,
    2,
    'completed',
  ]);
  assert.equal(sales.length, 1);
  assert.equal(sales[0].id, '70');
  assert.equal(sales[0].totalAmount, 18.5);
  assert.equal(sales[0].createdBy, '42');
});

test('findById returns sale details with items and payments', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    if (/FROM sales/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '70',
            customer_id: '1',
            branch_id: '2',
            status: 'completed',
            subtotal: '19.00',
            discount_amount: '1.00',
            tax_amount: '0.50',
            total_amount: '18.50',
            paid_amount: '18.50',
            balance_amount: '0.00',
            payment_status: 'paid',
            created_by: '42',
            created_at: new Date('2026-05-10T00:00:00.000Z'),
          },
        ],
      };
    }

    if (/FROM sale_items/.test(sql)) {
      return {
        rowCount: 2,
        rows: [
          {
            id: '90',
            sale_id: '70',
            product_id: '10',
            variant_id: '5',
            quantity: '2',
            unit_price: '9.50',
            discount_amount: '0.00',
            line_total: '19.00',
          },
          {
            id: '91',
            sale_id: '70',
            product_id: '11',
            variant_id: null,
            quantity: '1',
            unit_price: '3.00',
            discount_amount: '0.50',
            line_total: '2.50',
          },
        ],
      };
    }

    if (/FROM sale_payments/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '71',
            sale_id: '70',
            amount: '18.50',
            method: 'cash',
            reference_number: 'RCPT-70',
            notes: 'Paid in full',
            paid_at: new Date('2026-05-10T00:00:30.000Z'),
            created_by: '42',
            created_at: new Date('2026-05-10T00:00:30.000Z'),
          },
        ],
      };
    }

    return { rowCount: 0, rows: [] };
  };

  const sale = await saleService.findById(70);

  assert.match(queries[0].sql, /FROM sales/);
  assert.match(queries[0].sql, /WHERE id = \$1/);
  assert.match(queries[1].sql, /FROM sale_items/);
  assert.match(queries[1].sql, /ORDER BY id ASC/);
  assert.match(queries[2].sql, /FROM sale_payments/);
  assert.match(queries[2].sql, /ORDER BY paid_at ASC, id ASC/);
  assert.deepEqual(queries.map(({ params }) => params), [[70], [70], [70]]);
  assert.equal(sale.id, '70');
  assert.equal(sale.totalAmount, 18.5);
  assert.equal(sale.items.length, 2);
  assert.equal(sale.items[0].lineTotal, 19);
  assert.equal(sale.payments.length, 1);
  assert.equal(sale.payments[0].amount, 18.5);
  assert.equal(sale.payments[0].method, 'cash');
});

test('findById rejects missing sales', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(() => saleService.findById(999), {
    statusCode: 404,
    message: 'Sale not found.',
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /FROM sales/);
  assert.deepEqual(queries[0].params, [999]);
});

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

test('processRefund logs refund, restocks inventory, and updates sale status', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM sales/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '70',
              customer_id: '1',
              branch_id: '2',
              status: 'completed',
              subtotal: '19.00',
              discount_amount: '0.00',
              tax_amount: '0.00',
              total_amount: '19.00',
              paid_amount: '19.00',
              balance_amount: '0.00',
              payment_status: 'paid',
              created_by: '42',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
            },
          ],
        };
      }

      if (/FROM sale_items/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '90',
              sale_id: params[0],
              product_id: '10',
              variant_id: '5',
              quantity: '2',
              unit_price: '9.50',
              discount_amount: '0.00',
              line_total: '19.00',
            },
          ],
        };
      }

      if (/SELECT sale_item_id/.test(sql) && /FROM sale_refund_items/.test(sql)) {
        return { rowCount: 0, rows: [] };
      }

      if (/INSERT INTO sale_refunds/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '80',
              sale_id: params[0],
              amount: params[1],
              reason: params[2],
              method: params[3],
              reference_number: params[4],
              notes: params[5],
              created_by: params[6],
              created_at: new Date('2026-05-10T00:02:00.000Z'),
            },
          ],
        };
      }

      if (/INSERT INTO sale_refund_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '81',
              refund_id: params[0],
              sale_item_id: params[1],
              quantity: params[2],
              amount: params[3],
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
              quantity: 6,
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
              created_at: new Date('2026-05-10T00:03:00.000Z'),
            },
          ],
        };
      }

      if (/sold_quantity/.test(sql) && /refunded_quantity/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{ sold_quantity: '2', refunded_quantity: '1' }],
        };
      }

      if (/UPDATE sales/.test(sql)) {
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    },
    release: () => {},
  };

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => client;

  const refund = await saleService.processRefund(
    { id: 42 },
    {
      saleId: '70',
      reason: 'Customer return',
      refundMethod: 'cash',
      referenceNumber: 'RF-70',
      notes: 'Returned at counter',
      items: [{ saleItemId: '90', quantity: '1' }],
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
      queries[7].sql,
      queries[8].sql,
      queries[9].sql,
      queries[10].sql,
      'COMMIT',
    ]
  );
  assert.deepEqual(queries[4].params, [
    70,
    9.5,
    'Customer return',
    'cash',
    'RF-70',
    'Returned at counter',
    42,
  ]);
  assert.deepEqual(queries[5].params, ['80', 90, 1, 9.5]);
  assert.deepEqual(queries[6].params, [10, 2, 5]);
  assert.deepEqual(queries[7].params, ['30', 7]);
  assert.deepEqual(queries[8].params, [
    '30',
    10,
    5,
    2,
    6,
    7,
    1,
    'Sale 70 refunded',
    42,
  ]);
  assert.deepEqual(queries[10].params, [70, 'partially_refunded', 'partially_refunded']);
  assert.equal(refund.id, '80');
  assert.equal(refund.amount, 9.5);
  assert.equal(refund.items[0].quantity, 1);
  assert.equal(refund.saleStatus, 'partially_refunded');
  assert.equal(refund.inventoryAdjustments[0].quantityChange, 1);
});

test('processRefund rejects quantities already refunded and rolls back', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const saleService = require('../src/services/saleService');
  const originalConnect = database.pool.connect;
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM sales/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '70',
              branch_id: '2',
              status: 'partially_refunded',
            },
          ],
        };
      }

      if (/FROM sale_items/.test(sql) && /FOR UPDATE/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '90',
              sale_id: params[0],
              product_id: '10',
              variant_id: null,
              quantity: '2',
              unit_price: '9.50',
              discount_amount: '0.00',
              line_total: '19.00',
            },
          ],
        };
      }

      if (/SELECT sale_item_id/.test(sql) && /FROM sale_refund_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{ sale_item_id: '90', refunded_quantity: '2' }],
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
      saleService.processRefund(null, {
        saleId: '70',
        items: [{ saleItemId: '90', quantity: '1' }],
      }),
    {
      statusCode: 400,
      message: 'Refund quantity exceeds the remaining sale item quantity.',
    }
  );

  assert.equal(queries.some(({ sql }) => /INSERT INTO sale_refunds/.test(sql)), false);
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});
