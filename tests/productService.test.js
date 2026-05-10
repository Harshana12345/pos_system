const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('deleteProduct soft deletes an active product', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  let updateSql;
  let updateParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    updateSql = sql;
    updateParams = params;

    return { rowCount: 1, rows: [{ id: '1' }] };
  };

  await productService.deleteProduct('1');

  assert.match(updateSql, /UPDATE products/);
  assert.match(updateSql, /deleted_at = CURRENT_TIMESTAMP/);
  assert.match(updateSql, /updated_at = CURRENT_TIMESTAMP/);
  assert.match(updateSql, /deleted_at IS NULL/);
  assert.equal(updateParams[0], 1);
});

test('deleteProduct rejects missing or already deleted products', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rowCount: 0,
    rows: [],
  });

  await assert.rejects(() => productService.deleteProduct('1'), {
    message: 'Product not found.',
    statusCode: 404,
  });
});

test('findAll ignores soft-deleted products', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  let selectSql;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    selectSql = sql;

    return { rowCount: 0, rows: [] };
  };

  await productService.findAll();

  assert.match(selectSql, /WHERE deleted_at IS NULL/);
});
