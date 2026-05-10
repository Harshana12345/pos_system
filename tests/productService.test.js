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

test('findById returns a product with variants and images', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    if (/FROM products/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '1',
            name: 'Coffee',
            sku: 'COFFEE',
            barcode: null,
            description: 'Ground coffee',
            category_id: '2',
            brand_id: '3',
            cost_price: '8.00',
            selling_price: '12.00',
            tax_rate: '0.00',
            reorder_level: 5,
            status: 'active',
            expiry_date: null,
            supplier_id: '4',
            created_at: new Date('2026-05-01T00:00:00.000Z'),
            updated_at: new Date('2026-05-02T00:00:00.000Z'),
            deleted_at: null,
          },
        ],
      };
    }

    if (/FROM product_variants/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '11',
            product_id: '1',
            name: '250g',
            sku: 'COFFEE-250',
            barcode: null,
            attributes: { size: '250g' },
            cost_price: '8.00',
            selling_price: '12.00',
            stock_quantity: 20,
            reorder_level: 3,
            status: 'active',
            created_at: new Date('2026-05-01T00:00:00.000Z'),
            updated_at: new Date('2026-05-02T00:00:00.000Z'),
          },
        ],
      };
    }

    if (/FROM product_images/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '21',
            product_id: '1',
            image_url: '/uploads/products/coffee.jpg',
            alt_text: 'Coffee bag',
            display_order: 0,
            is_primary: true,
            created_at: new Date('2026-05-01T00:00:00.000Z'),
            updated_at: new Date('2026-05-02T00:00:00.000Z'),
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const product = await productService.findById('1');

  assert.match(queries[0].sql, /FROM products/);
  assert.match(queries[0].sql, /deleted_at IS NULL/);
  assert.deepEqual(queries[0].params, [1]);
  assert.match(queries[1].sql, /FROM product_variants/);
  assert.deepEqual(queries[1].params, [1]);
  assert.match(queries[2].sql, /FROM product_images/);
  assert.deepEqual(queries[2].params, [1]);
  assert.equal(product.id, '1');
  assert.equal(product.variants[0].sku, 'COFFEE-250');
  assert.equal(product.images[0].imageUrl, '/uploads/products/coffee.jpg');
});

test('findById rejects missing or soft-deleted products', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(() => productService.findById('1'), {
    message: 'Product not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /FROM products/);
  assert.match(queries[0].sql, /deleted_at IS NULL/);
  assert.equal(queries.length, 1);
});

test('findByBarcode returns product details for a product or variant barcode', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    if (/WITH matched_products/.test(sql)) {
      return {
        rowCount: 1,
        rows: [{ id: '1' }],
      };
    }

    if (/FROM products/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '1',
            name: 'Coffee',
            sku: 'COFFEE',
            barcode: '1234567890',
            description: 'Ground coffee',
            category_id: '2',
            brand_id: '3',
            cost_price: '8.00',
            selling_price: '12.00',
            tax_rate: '0.00',
            reorder_level: 5,
            status: 'active',
            expiry_date: null,
            supplier_id: '4',
            created_at: new Date('2026-05-01T00:00:00.000Z'),
            updated_at: new Date('2026-05-02T00:00:00.000Z'),
            deleted_at: null,
          },
        ],
      };
    }

    if (/FROM product_variants/.test(sql)) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '11',
            product_id: '1',
            name: '250g',
            sku: 'COFFEE-250',
            barcode: '1234567890-250',
            attributes: { size: '250g' },
            cost_price: '8.00',
            selling_price: '12.00',
            stock_quantity: 20,
            reorder_level: 3,
            status: 'active',
            created_at: new Date('2026-05-01T00:00:00.000Z'),
            updated_at: new Date('2026-05-02T00:00:00.000Z'),
          },
        ],
      };
    }

    if (/FROM product_images/.test(sql)) {
      return {
        rowCount: 0,
        rows: [],
      };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const product = await productService.findByBarcode(' 1234567890-250 ');

  assert.match(queries[0].sql, /product_variants/);
  assert.match(queries[0].sql, /products\.deleted_at IS NULL/);
  assert.deepEqual(queries[0].params, ['1234567890-250']);
  assert.deepEqual(queries[1].params, [1]);
  assert.equal(product.id, '1');
  assert.equal(product.variants[0].barcode, '1234567890-250');
});

test('findByBarcode rejects missing barcodes', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const productService = require('../src/services/productService');
  const originalQuery = database.query;
  const queries = [];

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params = []) => {
    queries.push({ sql, params });

    return { rowCount: 0, rows: [] };
  };

  await assert.rejects(() => productService.findByBarcode('missing'), {
    message: 'Product not found.',
    statusCode: 404,
  });

  assert.match(queries[0].sql, /WITH matched_products/);
  assert.deepEqual(queries[0].params, ['missing']);
  assert.equal(queries.length, 1);
});
