const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll returns brands ordered by id', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const brandService = require('../src/services/brandService');
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
          name: 'Acme',
          description: 'Retail products',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const brands = await brandService.findAll();

  assert.match(selectSql, /FROM brands/);
  assert.match(selectSql, /ORDER BY id ASC/);
  assert.equal(brands[0].name, 'Acme');
  assert.equal(brands[0].description, 'Retail products');
});

test('createBrand inserts brand details', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const brandService = require('../src/services/brandService');
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
          name: 'Bravo',
          description: 'Imported goods',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const brand = await brandService.createBrand({
    name: ' Bravo ',
    description: ' Imported goods ',
  });

  assert.match(insertSql, /INSERT INTO brands/);
  assert.deepEqual(insertParams, ['Bravo', 'Imported goods', 'active']);
  assert.equal(brand.id, '2');
});

test('updateBrand rejects missing brands', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const brandService = require('../src/services/brandService');
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
      brandService.updateBrand('1', {
        name: 'Acme',
      }),
    {
      message: 'Brand not found.',
      statusCode: 404,
    }
  );

  assert.match(updateSql, /UPDATE brands/);
  assert.match(updateSql, /WHERE id = \$1/);
});

test('deleteBrand deletes by id and rejects missing brands', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const brandService = require('../src/services/brandService');
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

  await brandService.deleteBrand('1');

  await assert.rejects(() => brandService.deleteBrand('2'), {
    message: 'Brand not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /DELETE FROM brands/);
  assert.deepEqual(queries[0].params, [1]);
});
