const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll returns suppliers ordered by id', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
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
          name: 'Acme Supply',
          contact_number: '+94112223344',
          email: 'orders@example.com',
          address: '12 Main Street',
          tax_id: 'VAT-123',
          notes: 'Preferred supplier',
          balance: '10.50',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const suppliers = await supplierService.findAll();

  assert.match(selectSql, /FROM suppliers/);
  assert.match(selectSql, /ORDER BY id ASC/);
  assert.equal(suppliers[0].name, 'Acme Supply');
  assert.equal(suppliers[0].contactNumber, '+94112223344');
  assert.equal(suppliers[0].taxId, 'VAT-123');
  assert.equal(suppliers[0].balance, 10.5);
});

test('createSupplier inserts supplier details', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
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
          name: 'Bravo Supply',
          contact_number: '+94115556677',
          email: 'sales@example.com',
          address: '45 Market Road',
          tax_id: 'VAT-456',
          notes: 'Net 30',
          balance: '25.75',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const supplier = await supplierService.createSupplier({
    name: ' Bravo Supply ',
    contactNumber: ' +94115556677 ',
    email: ' sales@example.com ',
    address: ' 45 Market Road ',
    taxId: ' VAT-456 ',
    notes: ' Net 30 ',
    balance: '25.75',
  });

  assert.match(insertSql, /INSERT INTO suppliers/);
  assert.deepEqual(insertParams, [
    'Bravo Supply',
    '+94115556677',
    'sales@example.com',
    '45 Market Road',
    'VAT-456',
    'Net 30',
    25.75,
    'active',
  ]);
  assert.equal(supplier.id, '2');
});

test('updateSupplier rejects missing suppliers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
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
      supplierService.updateSupplier('1', {
        name: 'Acme Supply',
      }),
    {
      message: 'Supplier not found.',
      statusCode: 404,
    }
  );

  assert.match(updateSql, /UPDATE suppliers/);
  assert.match(updateSql, /WHERE id = \$1/);
});

test('deleteSupplier deletes by id and rejects missing suppliers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
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

  await supplierService.deleteSupplier('1');

  await assert.rejects(() => supplierService.deleteSupplier('2'), {
    message: 'Supplier not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /DELETE FROM suppliers/);
  assert.deepEqual(queries[0].params, [1]);
});
