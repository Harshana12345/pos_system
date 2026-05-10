const assert = require('node:assert');
const test = require('node:test');

const {
  validateResumePayload,
  validateRefundPayload,
  validateSaleFilters,
  validateSalePayload,
  validateSuspendedSalePayload,
} = require('../src/validators/saleValidator');

test('validateSaleFilters accepts supported sales query filters', () => {
  const errors = validateSaleFilters({
    startDate: '2026-05-01',
    end_date: '2026-05-10T23:59:59.000Z',
    cashier: '3',
    branch_id: '2',
    status: 'completed',
  });

  assert.deepEqual(errors, []);
});

test('validateSaleFilters rejects invalid sales query filters', () => {
  const errors = validateSaleFilters({
    dateFrom: '2026-05-11',
    dateTo: '2026-05-10',
    cashier_id: 'cashier',
    branchId: '0',
    status: '   ',
  });

  assert.deepEqual(errors, [
    'Branch ID must be a positive integer.',
    'Cashier ID must be a positive integer.',
    'Sale status must be a non-empty string.',
    'Date from must be before or equal to date to.',
  ]);
});

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

test('validateSalePayload accepts split sale payments', () => {
  const errors = validateSalePayload({
    branchId: '2',
    discountAmount: '1.00',
    taxAmount: '0.50',
    payments: [
      {
        amount: '10.00',
        method: 'cash',
        notes: 'Cash tendered',
      },
      {
        amount: '8.50',
        method: 'card',
        reference_number: 'CARD-1',
        paid_at: '2026-05-10T00:00:00.000Z',
      },
    ],
    items: [
      {
        productId: '10',
        quantity: '2',
        unitPrice: '9.50',
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

test('validateSalePayload rejects invalid split payments', () => {
  const errors = validateSalePayload({
    branchId: '2',
    payments: [
      {
        amount: '0',
        method: 42,
        referenceNumber: false,
        notes: [],
        paidAt: 'not-a-date',
      },
      null,
    ],
    items: [{ productId: '10', quantity: '1', unitPrice: '5.00' }],
  });

  assert.deepEqual(errors, [
    'Payment 1 amount must be a positive number.',
    'Payment 1 method must be a string.',
    'Payment 1 reference number must be a string.',
    'Payment 1 notes must be a string.',
    'Payment 1 date must be a valid date.',
    'Payment 2 details are required.',
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

test('validateSuspendedSalePayload accepts sale draft without payment', () => {
  const errors = validateSuspendedSalePayload({
    customerId: '1',
    branchId: '2',
    discountAmount: '1.00',
    taxAmount: '0.50',
    items: [
      {
        productId: '10',
        quantity: '2',
        unitPrice: '9.50',
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test('validateResumePayload requires a suspended sale ID', () => {
  assert.deepEqual(validateResumePayload({ sale_id: '70' }), []);
  assert.deepEqual(validateResumePayload({ saleId: 'sale' }), [
    'Sale ID must be a positive integer.',
  ]);
  assert.deepEqual(validateResumePayload(null), ['Suspended sale details are required.']);
});

test('validateRefundPayload accepts a sale refund payload', () => {
  const errors = validateRefundPayload({
    sale_id: '70',
    reason: 'Customer return',
    refundMethod: 'cash',
    reference_number: 'RF-70',
    notes: 'Returned at counter',
    items: [
      {
        sale_item_id: '90',
        quantity: '1',
      },
    ],
  });

  assert.deepEqual(errors, []);
});

test('validateRefundPayload rejects invalid refund fields', () => {
  const errors = validateRefundPayload({
    saleId: 'sale',
    reason: 99,
    refundMethod: false,
    refundReferenceNumber: 42,
    notes: [],
    items: [
      {
        saleItemId: 'item',
        quantity: '0',
      },
      null,
    ],
  });

  assert.deepEqual(errors, [
    'Sale ID must be a positive integer.',
    'Refund reason must be a string.',
    'Refund method must be a string.',
    'Refund reference number must be a string.',
    'Refund notes must be a string.',
    'Refund item 1 sale item ID must be a positive integer.',
    'Refund item 1 quantity must be a positive integer.',
    'Refund item 2 details are required.',
  ]);
});
