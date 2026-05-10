const assert = require('node:assert');
const test = require('node:test');

const {
  validateSupplierId,
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
