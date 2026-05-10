const assert = require('node:assert');
const test = require('node:test');

const { validateSalePayload } = require('../src/validators/saleValidator');

test('validateSalePayload accepts a completed sale payload', () => {
  const errors = validateSalePayload({
    customerId: '1',
    branch_id: '2',
    discountAmount: '1.00',
    tax_amount: '0.50',
    paidAmount: '20.00',
    payment: {
      method: 'cash',
      referenceNumber: 'RCPT-1',
      notes: 'Counter sale',
    },
    items: [
      {
        productId: '10',
        variant_id: '4',
        quantity: '2',
        unit_price: '9.50',
        discountAmount: '0.50',
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test('validateSalePayload rejects missing sale fields', () => {
  const errors = validateSalePayload({
    customerId: 'abc',
    branchId: '0',
    discountAmount: '-1',
    taxAmount: '-0.01',
    paidAmount: 'cash',
    paymentMethod: 42,
    paymentReferenceNumber: 99,
    paymentNotes: false,
    items: [],
  });

  assert.deepEqual(errors, [
    'Customer ID must be a positive integer.',
    'Branch ID must be a positive integer.',
    'Sale discount amount must be a non-negative number.',
    'Sale tax amount must be a non-negative number.',
    'Paid amount must be a positive number.',
    'Payment method must be a string.',
    'Payment reference number must be a string.',
    'Payment notes must be a string.',
    'At least one sale item is required.',
  ]);
});

test('validateSalePayload rejects invalid sale items', () => {
  const errors = validateSalePayload({
    branchId: '2',
    paidAmount: '10',
    items: [
      {
        product_id: 'abc',
        variantId: 'nope',
        quantity: '0',
        unitPrice: '-1',
        discount_amount: '-0.50',
      },
      null,
    ],
  });

  assert.deepEqual(errors, [
    'Sale item 1 product ID must be a positive integer.',
    'Sale item 1 variant ID must be a positive integer.',
    'Sale item 1 quantity must be a positive integer.',
    'Sale item 1 unit price must be a non-negative number.',
    'Sale item 1 discount amount must be a non-negative number.',
    'Sale item 2 details are required.',
  ]);
});
