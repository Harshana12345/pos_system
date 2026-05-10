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

test('findPurchaseHistoryById returns supplier purchases with items', {
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

    if (/FROM suppliers/.test(sql)) {
      return {
        rowCount: 1,
        rows: [{ id: '1' }],
      };
    }

    return {
      rowCount: 3,
      rows: [
        {
          id: '10',
          supplier_id: '1',
          branch_id: '2',
          status: 'received',
          total_amount: '35.50',
          notes: 'Weekly order',
          created_by: '7',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          item_id: '100',
          purchase_order_id: '10',
          product_id: '20',
          quantity: '2',
          cost_price: '10.25',
        },
        {
          id: '10',
          supplier_id: '1',
          branch_id: '2',
          status: 'received',
          total_amount: '35.50',
          notes: 'Weekly order',
          created_by: '7',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          item_id: '101',
          purchase_order_id: '10',
          product_id: '21',
          quantity: '3',
          cost_price: '5.00',
        },
        {
          id: '9',
          supplier_id: '1',
          branch_id: '2',
          status: 'draft',
          total_amount: '0.00',
          notes: null,
          created_by: '7',
          created_at: new Date('2026-04-30T00:00:00.000Z'),
          item_id: null,
          purchase_order_id: null,
          product_id: null,
          quantity: null,
          cost_price: null,
        },
      ],
    };
  };

  const purchases = await supplierService.findPurchaseHistoryById('1');

  assert.match(queries[0].sql, /FROM suppliers/);
  assert.match(queries[1].sql, /FROM purchase_orders po/);
  assert.match(queries[1].sql, /LEFT JOIN purchase_order_items poi/);
  assert.deepEqual(queries[0].params, [1]);
  assert.deepEqual(queries[1].params, [1]);
  assert.equal(purchases.length, 2);
  assert.equal(purchases[0].id, '10');
  assert.equal(purchases[0].totalAmount, 35.5);
  assert.equal(purchases[0].items.length, 2);
  assert.equal(purchases[0].items[0].lineTotal, 20.5);
  assert.equal(purchases[1].id, '9');
  assert.deepEqual(purchases[1].items, []);
});

test('findPurchaseHistoryById rejects missing suppliers', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rowCount: 0,
    rows: [],
  });

  await assert.rejects(() => supplierService.findPurchaseHistoryById('99'), {
    message: 'Supplier not found.',
    statusCode: 404,
  });
});

test('createSupplierPayment records payment and reduces supplier balance', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
  const originalConnect = database.pool.connect;
  const queries = [];

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  const client = {
    query: async (sql, params) => {
      queries.push({ sql, params });

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }

      if (/FROM suppliers/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{ id: '1', balance: '25.75' }],
        };
      }

      if (/INSERT INTO supplier_payments/.test(sql)) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '5',
              supplier_id: '1',
              amount: '10.50',
              method: 'cash',
              reference_number: 'PAY-001',
              notes: 'Partial payment',
              paid_at: new Date('2026-05-10T10:00:00.000Z'),
              created_by: '7',
              created_at: new Date('2026-05-10T10:01:00.000Z'),
            },
          ],
        };
      }

      return {
        rowCount: 1,
        rows: [],
      };
    },
    release: () => {},
  };

  database.pool.connect = async () => client;

  const payment = await supplierService.createSupplierPayment(
    '1',
    { id: '7' },
    {
      amount: '10.50',
      method: ' cash ',
      referenceNumber: ' PAY-001 ',
      notes: ' Partial payment ',
      paidAt: '2026-05-10T10:00:00.000Z',
    }
  );

  assert.equal(queries[0].sql, 'BEGIN');
  assert.match(queries[1].sql, /FROM suppliers/);
  assert.match(queries[1].sql, /FOR UPDATE/);
  assert.deepEqual(queries[1].params, [1]);
  assert.match(queries[2].sql, /INSERT INTO supplier_payments/);
  assert.deepEqual(queries[2].params.slice(0, 5), [
    1,
    10.5,
    'cash',
    'PAY-001',
    'Partial payment',
  ]);
  assert.equal(queries[2].params[6], '7');
  assert.match(queries[3].sql, /UPDATE suppliers/);
  assert.deepEqual(queries[3].params, [1, 15.25]);
  assert.equal(queries[4].sql, 'COMMIT');
  assert.equal(payment.id, '5');
  assert.equal(payment.amount, 10.5);
  assert.equal(payment.supplierBalance, 15.25);
});

test('createSupplierPayment rejects missing suppliers and overpayments', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const supplierService = require('../src/services/supplierService');
  const originalConnect = database.pool.connect;
  const balances = [null, '5.00'];
  const queries = [];

  t.after(() => {
    database.pool.connect = originalConnect;
  });

  database.pool.connect = async () => ({
    query: async (sql) => {
      queries.push(sql);

      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }

      const balance = balances.shift();

      if (balance === null) {
        return { rowCount: 0, rows: [] };
      }

      return {
        rowCount: 1,
        rows: [{ id: '1', balance }],
      };
    },
    release: () => {},
  });

  await assert.rejects(
    () => supplierService.createSupplierPayment('99', null, { amount: '1.00' }),
    {
      message: 'Supplier not found.',
      statusCode: 404,
    }
  );

  await assert.rejects(
    () => supplierService.createSupplierPayment('1', null, { amount: '10.00' }),
    {
      message: 'Supplier payment amount exceeds outstanding balance.',
      statusCode: 400,
    }
  );

  assert.equal(queries.filter((sql) => sql === 'ROLLBACK').length, 2);
});
