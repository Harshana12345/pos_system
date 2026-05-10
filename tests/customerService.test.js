const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll returns customers ordered by id', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  let selectSql;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    selectSql = sql;

    return {
      rowCount: 1,
      rows: [
        {
          id: '1',
          full_name: 'Jane Perera',
          phone: '+94112223344',
          email: 'jane@example.com',
          address: '12 Main Street',
          loyalty_points: 10,
          credit_balance: '25.50',
          notes: 'Prefers SMS',
          status: 'active',
          customer_group_id: '2',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const customers = await customerService.findAll();

  assert.match(selectSql, /FROM customers/);
  assert.match(selectSql, /ORDER BY id ASC/);
  assert.equal(customers[0].fullName, 'Jane Perera');
  assert.equal(customers[0].loyaltyPoints, 10);
  assert.equal(customers[0].creditBalance, 25.5);
  assert.equal(customers[0].customerGroupId, '2');
});

test('findById returns a customer or rejects missing customers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    return queries.length === 1
      ? {
          rowCount: 1,
          rows: [
            {
              id: '1',
              full_name: 'Jane Perera',
              phone: null,
              email: null,
              address: null,
              loyalty_points: 0,
              credit_balance: '0.00',
              notes: null,
              status: 'active',
              customer_group_id: null,
              created_at: new Date('2026-05-01T00:00:00.000Z'),
              updated_at: new Date('2026-05-02T00:00:00.000Z'),
            },
          ],
        }
      : { rowCount: 0, rows: [] };
  };

  const customer = await customerService.findById('1');

  await assert.rejects(() => customerService.findById('2'), {
    message: 'Customer not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /WHERE id = \$1/);
  assert.deepEqual(queries[0].params, [1]);
  assert.equal(customer.id, '1');
});

test('findPurchaseHistoryById returns customer sales with items', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    if (/FROM customers/.test(sql)) {
      return {
        rowCount: 1,
        rows: [{ id: '1' }],
      };
    }

    return {
      rowCount: 3,
      rows: [
        {
          id: '20',
          customer_id: '1',
          branch_id: '2',
          status: 'completed',
          subtotal: '40.00',
          discount_amount: '2.00',
          tax_amount: '1.50',
          total_amount: '39.50',
          paid_amount: '39.50',
          balance_amount: '0.00',
          payment_status: 'paid',
          created_by: '7',
          created_at: new Date('2026-05-10T10:00:00.000Z'),
          item_id: '200',
          sale_id: '20',
          product_id: '30',
          variant_id: null,
          quantity: '2',
          unit_price: '10.00',
          item_discount_amount: '1.00',
          line_total: '19.00',
        },
        {
          id: '20',
          customer_id: '1',
          branch_id: '2',
          status: 'completed',
          subtotal: '40.00',
          discount_amount: '2.00',
          tax_amount: '1.50',
          total_amount: '39.50',
          paid_amount: '39.50',
          balance_amount: '0.00',
          payment_status: 'paid',
          created_by: '7',
          created_at: new Date('2026-05-10T10:00:00.000Z'),
          item_id: '201',
          sale_id: '20',
          product_id: '31',
          variant_id: '4',
          quantity: '1',
          unit_price: '20.00',
          item_discount_amount: '1.00',
          line_total: '19.00',
        },
        {
          id: '19',
          customer_id: '1',
          branch_id: '2',
          status: 'voided',
          subtotal: '0.00',
          discount_amount: '0.00',
          tax_amount: '0.00',
          total_amount: '0.00',
          paid_amount: '0.00',
          balance_amount: '0.00',
          payment_status: 'voided',
          created_by: '7',
          created_at: new Date('2026-05-09T10:00:00.000Z'),
          item_id: null,
          sale_id: null,
          product_id: null,
          variant_id: null,
          quantity: null,
          unit_price: null,
          item_discount_amount: null,
          line_total: null,
        },
      ],
    };
  };

  const sales = await customerService.findPurchaseHistoryById('1');

  assert.match(queries[0].sql, /FROM customers/);
  assert.match(queries[1].sql, /FROM sales s/);
  assert.match(queries[1].sql, /LEFT JOIN sale_items si/);
  assert.deepEqual(queries[0].params, [1]);
  assert.deepEqual(queries[1].params, [1]);
  assert.equal(sales.length, 2);
  assert.equal(sales[0].id, '20');
  assert.equal(sales[0].totalAmount, 39.5);
  assert.equal(sales[0].items.length, 2);
  assert.equal(sales[0].items[0].lineTotal, 19);
  assert.equal(sales[1].id, '19');
  assert.deepEqual(sales[1].items, []);
});

test('findPurchaseHistoryById rejects missing customers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rowCount: 0,
    rows: [],
  });

  await assert.rejects(() => customerService.findPurchaseHistoryById('99'), {
    message: 'Customer not found.',
    statusCode: 404,
  });
});

test('createCustomer inserts customer details', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  let insertSql;
  let insertParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    insertSql = sql;
    insertParams = params;

    return {
      rowCount: 1,
      rows: [
        {
          id: '2',
          full_name: 'Ravi Silva',
          phone: '+94115556677',
          email: 'ravi@example.com',
          address: '45 Market Road',
          loyalty_points: 15,
          credit_balance: '12.75',
          notes: 'VIP',
          status: 'active',
          customer_group_id: 3,
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const customer = await customerService.createCustomer({
    fullName: ' Ravi Silva ',
    phone: ' +94115556677 ',
    email: ' ravi@example.com ',
    address: ' 45 Market Road ',
    loyaltyPoints: '15',
    creditBalance: '12.75',
    notes: ' VIP ',
    customerGroupId: '3',
  });

  assert.match(insertSql, /INSERT INTO customers/);
  assert.deepEqual(insertParams, [
    'Ravi Silva',
    '+94115556677',
    'ravi@example.com',
    '45 Market Road',
    15,
    12.75,
    'VIP',
    'active',
    3,
  ]);
  assert.equal(customer.id, '2');
});

test('updateCustomer rejects missing customers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  let updateSql;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    updateSql = sql;

    return {
      rowCount: 0,
      rows: [],
    };
  };

  await assert.rejects(
    () =>
      customerService.updateCustomer('1', {
        fullName: 'Jane Perera',
      }),
    {
      message: 'Customer not found.',
      statusCode: 404,
    }
  );

  assert.match(updateSql, /UPDATE customers/);
  assert.match(updateSql, /WHERE id = \$1/);
});

test('adjustLoyaltyPoints adds and redeems points', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    return {
      rowCount: 1,
      rows: [
        {
          id: '1',
          full_name: 'Jane Perera',
          phone: null,
          email: null,
          address: null,
          loyalty_points: /loyalty_points \+ \$2/.test(sql) ? 25 : 20,
          credit_balance: '0.00',
          notes: null,
          status: 'active',
          customer_group_id: null,
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const addedCustomer = await customerService.adjustLoyaltyPoints('1', {
    action: 'add',
    points: '15',
  });
  const redeemedCustomer = await customerService.adjustLoyaltyPoints('1', {
    action: 'redeem',
    points: 5,
  });

  assert.match(queries[0].sql, /loyalty_points = loyalty_points \+ \$2/);
  assert.doesNotMatch(queries[0].sql, /loyalty_points >= \$2/);
  assert.deepEqual(queries[0].params, [1, 15]);
  assert.match(queries[1].sql, /loyalty_points = loyalty_points - \$2/);
  assert.match(queries[1].sql, /loyalty_points >= \$2/);
  assert.deepEqual(queries[1].params, [1, 5]);
  assert.equal(addedCustomer.loyaltyPoints, 25);
  assert.equal(redeemedCustomer.loyaltyPoints, 20);
});

test('adjustLoyaltyPoints rejects missing customers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(
    () =>
      customerService.adjustLoyaltyPoints('99', {
        action: 'add',
        points: 10,
      }),
    {
      message: 'Customer not found.',
      statusCode: 404,
    }
  );

  assert.match(queries[0].sql, /UPDATE customers/);
  assert.match(queries[1].sql, /FROM customers/);
  assert.deepEqual(queries[1].params, [99]);
});

test('adjustLoyaltyPoints rejects insufficient points when redeeming', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    return queries.length === 1
      ? { rowCount: 0, rows: [] }
      : { rowCount: 1, rows: [{ id: '1' }] };
  };

  await assert.rejects(
    () =>
      customerService.adjustLoyaltyPoints('1', {
        action: 'redeem',
        points: 50,
      }),
    {
      message: 'Insufficient loyalty points.',
      statusCode: 400,
    }
  );

  assert.match(queries[0].sql, /loyalty_points >= \$2/);
  assert.deepEqual(queries[0].params, [1, 50]);
  assert.deepEqual(queries[1].params, [1]);
});

test('deleteCustomer deletes by id and rejects missing customers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const customerService = require('../src/services/customerService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    queries.push({ sql, params });

    return queries.length === 1
      ? { rowCount: 1, rows: [{ id: '1' }] }
      : { rowCount: 0, rows: [] };
  };

  await customerService.deleteCustomer('1');

  await assert.rejects(() => customerService.deleteCustomer('2'), {
    message: 'Customer not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /DELETE FROM customers/);
  assert.deepEqual(queries[0].params, [1]);
});
