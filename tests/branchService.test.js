const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('deleteBranch soft deletes an active branch', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const branchService = require('../src/services/branchService');
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

  await branchService.deleteBranch('1');

  assert.match(updateSql, /UPDATE branches/);
  assert.match(updateSql, /deleted_at = CURRENT_TIMESTAMP/);
  assert.match(updateSql, /updated_at = CURRENT_TIMESTAMP/);
  assert.match(updateSql, /deleted_at IS NULL/);
  assert.equal(updateParams[0], 1);
});

test('deleteBranch rejects missing or already deleted branches', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const branchService = require('../src/services/branchService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rowCount: 0,
    rows: [],
  });

  await assert.rejects(() => branchService.deleteBranch('1'), {
    message: 'Branch not found.',
    statusCode: 404,
  });
});

test('updateBranch ignores soft-deleted branches', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const branchService = require('../src/services/branchService');
  const originalQuery = database.query;
  let updateSql;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    updateSql = sql;

    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(
    () =>
      branchService.updateBranch('1', {
        name: 'Downtown',
      }),
    {
      message: 'Branch not found.',
      statusCode: 404,
    }
  );

  assert.match(updateSql, /deleted_at IS NULL/);
});
