const assert = require('node:assert');
const test = require('node:test');

const {
  validateProductId,
  validateUpdateProductPayload,
} = require('../src/validators/productValidator');

test('product id validation requires a positive integer', () => {
  assert.deepEqual(validateProductId('0'), ['Product ID must be a positive integer.']);
  assert.deepEqual(validateProductId('abc'), ['Product ID must be a positive integer.']);
  assert.deepEqual(validateProductId('1'), []);
});

test('update product payload validates details, variants, and images', () => {
  const errors = validateUpdateProductPayload({
    name: 'Coffee',
    sku: 'COF-001',
    costPrice: 5,
    sellingPrice: 8,
    taxRate: 0,
    reorderLevel: 10,
    status: 'active',
    variants: [
      {
        name: 'Coffee 250g',
        sku: 'COF-250',
        attributes: { size: '250g' },
        stockQuantity: 4,
      },
    ],
    images: [
      {
        imageUrl: '/uploads/products/coffee.jpg',
        altText: 'Coffee bag',
        displayOrder: 0,
        isPrimary: true,
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test('update product payload rejects invalid nested collections', () => {
  const errors = validateUpdateProductPayload({
    name: '',
    sku: 'COF-001',
    variants: [null],
    images: [
      { imageUrl: '/uploads/products/coffee.jpg', isPrimary: true },
      { imageUrl: '/uploads/products/coffee-2.jpg', isPrimary: true },
    ],
  });

  assert.match(errors.join(' '), /Product name is required/);
  assert.match(errors.join(' '), /Product variant 1 must be an object/);
  assert.match(errors.join(' '), /Only one product image can be primary/);
});
