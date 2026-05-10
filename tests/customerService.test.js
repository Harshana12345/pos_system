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
