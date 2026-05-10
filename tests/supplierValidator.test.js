const assert = require('node:assert');
const test = require('node:test');

const {
  validateSupplierId,
  validateSupplierPaymentPayload,
  validateSupplierPayload,
} = require('../src/validators/supplierValidator');

test('supplier id validation requires a positive integer', () => {
  assert.deepEqual(validateSupplierId('0'), ['Supplier ID must be a positive integer.']);
  assert.deepEqual(validateSupplierId('abc'), ['Supplier ID must be a positive integer.']);
  assert.deepEqual(validateSupplierId('1'), []);
});

test('supplier payload validation accepts valid details', () => {
  const errors = validateSupplierPayload({
    name: 'Acme Supply',
    contactNumber: '+94112223344',
    email: 'orders@example.com',
    address: '12 Main Street',
    taxId: 'VAT-123',
    notes: 'Preferred supplier',
    balance: '10.50',
    status: 'active',
  });

  assert.deepEqual(errors, []);
});

test('supplier payload validation rejects invalid details', () => {
  const errors = validateSupplierPayload({
    name: '',
    contactNumber: 123,
    email: 123,
    address: 123,
    taxId: 123,
    notes: 123,
    balance: -1,
    status: 'archived',
  });

  assert.match(errors.join(' '), /Supplier name is required/);
  assert.match(errors.join(' '), /Supplier contact number must be a string/);
  assert.match(errors.join(' '), /Supplier email must be a string/);
  assert.match(errors.join(' '), /Supplier address must be a string/);
  assert.match(errors.join(' '), /Supplier tax ID must be a string/);
  assert.match(errors.join(' '), /Supplier notes must be a string/);
  assert.match(errors.join(' '), /Supplier balance must be a non-negative number/);
  assert.match(errors.join(' '), /Supplier status must be active or inactive/);
});

test('supplier payment payload validation accepts valid details', () => {
  const errors = validateSupplierPaymentPayload({
    amount: '10.50',
    method: 'cash',
    referenceNumber: 'PAY-001',
    notes: 'Partial payment',
    paidAt: '2026-05-10T10:00:00.000Z',
  });

  assert.deepEqual(errors, []);
});

test('supplier payment payload validation rejects invalid details', () => {
  const errors = validateSupplierPaymentPayload({
    amount: 0,
    method: 123,
    referenceNumber: 123,
    notes: 123,
    paidAt: 'not-a-date',
  });

  assert.match(errors.join(' '), /Supplier payment amount must be a positive number/);
  assert.match(errors.join(' '), /Supplier payment method must be a string/);
  assert.match(
    errors.join(' '),
    /Supplier payment reference number must be a string/
  );
  assert.match(errors.join(' '), /Supplier payment notes must be a string/);
  assert.match(errors.join(' '), /Supplier payment date must be a valid date/);
});
