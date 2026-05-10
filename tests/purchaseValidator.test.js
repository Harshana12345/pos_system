const assert = require('node:assert');
const test = require('node:test');

const { validatePurchasePayload } = require('../src/validators/purchaseValidator');

test('validatePurchasePayload accepts a valid purchase order payload', () => {
  const errors = validatePurchasePayload({
    supplierId: '1',
    branch_id: '2',
    status: 'ordered',
    notes: 'Weekly stock order',
    items: [
      {
        productId: '10',
        quantity: '3',
        cost_price: '12.50',
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test('validatePurchasePayload rejects missing purchase order fields', () => {
  const errors = validatePurchasePayload({
    supplierId: '0',
    branchId: 'abc',
    status: 'closed',
    notes: 42,
    items: [],
  });

  assert.deepEqual(errors, [
    'Supplier ID must be a positive integer.',
    'Branch ID must be a positive integer.',
    'Purchase status must be draft, ordered, received, or cancelled.',
    'Purchase notes must be a string.',
    'At least one purchase item is required.',
  ]);
});

test('validatePurchasePayload rejects invalid line items', () => {
  const errors = validatePurchasePayload({
    supplierId: '1',
    branchId: '2',
    items: [
      {
        product_id: 'abc',
        quantity: '0',
        costPrice: '-1',
      },
      null,
    ],
  });

  assert.deepEqual(errors, [
    'Purchase item 1 product ID must be a positive integer.',
    'Purchase item 1 quantity must be a positive integer.',
    'Purchase item 1 cost price must be a non-negative number.',
    'Purchase item 2 details are required.',
  ]);
});
