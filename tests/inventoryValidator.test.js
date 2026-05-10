const assert = require('node:assert');
const test = require('node:test');

const { validateInventoryFilters } = require('../src/validators/inventoryValidator');

test('inventory filter validation accepts missing or valid branch id', () => {
  assert.deepEqual(validateInventoryFilters({}), []);
  assert.deepEqual(validateInventoryFilters({ branchId: '1' }), []);
  assert.deepEqual(validateInventoryFilters({ branch_id: '2' }), []);
});

test('inventory filter validation rejects invalid branch id', () => {
  assert.deepEqual(validateInventoryFilters({ branchId: '0' }), [
    'Branch ID must be a positive integer.',
  ]);
  assert.deepEqual(validateInventoryFilters({ branchId: 'abc' }), [
    'Branch ID must be a positive integer.',
  ]);
});
