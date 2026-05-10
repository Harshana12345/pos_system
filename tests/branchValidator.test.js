const assert = require('node:assert');
const test = require('node:test');

const {
  validateBranchId,
  validateUpdateBranchPayload,
} = require('../src/validators/branchValidator');

test('branch id validation requires a positive integer', () => {
  assert.deepEqual(validateBranchId('1'), []);
  assert.deepEqual(validateBranchId('0'), ['Branch ID must be a positive integer.']);
  assert.deepEqual(validateBranchId('abc'), ['Branch ID must be a positive integer.']);
});

test('update branch payload validation requires a branch name', () => {
  assert.deepEqual(validateUpdateBranchPayload({}), ['Branch name is required.']);
  assert.deepEqual(validateUpdateBranchPayload({ name: '   ' }), ['Branch name is required.']);
  assert.deepEqual(validateUpdateBranchPayload({ name: 123 }), ['Branch name is required.']);
});

test('update branch payload validation accepts valid branch details', () => {
  const errors = validateUpdateBranchPayload({
    name: 'Downtown',
    address: 'Main Street',
    contact: '+100000000',
    taxInfo: 'VAT 123',
    currency: 'USD',
    status: 'active',
  });

  assert.deepEqual(errors, []);
});

test('update branch payload validation rejects invalid currency and status', () => {
  const errors = validateUpdateBranchPayload({
    name: 'Downtown',
    currency: 'usd',
    status: 'closed',
  });

  assert.deepEqual(errors, [
    'Branch currency must be a 3-letter uppercase ISO code.',
    'Branch status must be active or inactive.',
  ]);
});
