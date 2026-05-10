const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test('findAll returns categories ordered by id', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const categoryService = require('../src/services/categoryService');
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
          name: 'Beverages',
          parent_id: null,
          description: 'Drinks',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const categories = await categoryService.findAll();

  assert.match(selectSql, /FROM categories/);
  assert.match(selectSql, /ORDER BY id ASC/);
  assert.equal(categories[0].name, 'Beverages');
  assert.equal(categories[0].parentId, null);
});

test('createCategory inserts category details', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const categoryService = require('../src/services/categoryService');
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
          name: 'Coffee',
          parent_id: 1,
          description: 'Hot drinks',
          status: 'active',
          created_at: new Date('2026-05-01T00:00:00.000Z'),
          updated_at: new Date('2026-05-02T00:00:00.000Z'),
        },
      ],
    };
  };

  const category = await categoryService.createCategory({
    name: ' Coffee ',
    parentId: '1',
    description: ' Hot drinks ',
  });

  assert.match(insertSql, /INSERT INTO categories/);
  assert.deepEqual(insertParams, ['Coffee', 1, 'Hot drinks', 'active']);
  assert.equal(category.id, '2');
});

test('updateCategory rejects missing categories', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const categoryService = require('../src/services/categoryService');
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
      categoryService.updateCategory('1', {
        name: 'Beverages',
      }),
    {
      message: 'Category not found.',
      statusCode: 404,
    }
  );

  assert.match(updateSql, /UPDATE categories/);
  assert.match(updateSql, /WHERE id = \$1/);
});

test('updateCategory rejects self parent references', {
  skip: !dependenciesAvailable,
}, async () => {
  const categoryService = require('../src/services/categoryService');

  await assert.rejects(
    () =>
      categoryService.updateCategory('1', {
        name: 'Beverages',
        parentId: '1',
      }),
    {
      message: 'Category cannot be its own parent.',
      statusCode: 400,
    }
  );
});

test('deleteCategory deletes by id and rejects missing categories', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const categoryService = require('../src/services/categoryService');
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

  await categoryService.deleteCategory('1');

  await assert.rejects(() => categoryService.deleteCategory('2'), {
    message: 'Category not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /DELETE FROM categories/);
  assert.deepEqual(queries[0].params, [1]);
});
