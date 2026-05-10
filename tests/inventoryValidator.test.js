const assert = require('node:assert');
const test = require('node:test');

const {
  validateInventoryAdjustmentPayload,
  validateInventoryFilters,
} = require('../src/validators/inventoryValidator');

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

test('inventory adjustment validation accepts absolute or delta adjustments', () => {
  assert.deepEqual(
    validateInventoryAdjustmentPayload({
      inventoryId: '1',
      quantity: '12',
      reason: 'Cycle count correction',
    }),
    []
  );
  assert.deepEqual(
    validateInventoryAdjustmentPayload({
      inventory_id: '2',
      quantity_change: '-3',
      reason: 'Damaged stock',
    }),
    []
  );
});

test('inventory adjustment validation rejects invalid payloads', () => {
  assert.deepEqual(validateInventoryAdjustmentPayload({}), [
    'Inventory ID must be a positive integer.',
    'Quantity or quantity change is required.',
    'Reason is required.',
  ]);
  assert.deepEqual(
    validateInventoryAdjustmentPayload({
      inventoryId: '1',
      quantity: '5',
      quantityChange: '1',
      reason: 'Duplicate fields',
    }),
    ['Provide either quantity or quantity change, not both.']
  );
  assert.deepEqual(
    validateInventoryAdjustmentPayload({
      inventoryId: '1',
      quantity: '-1',
      reason: 'Bad quantity',
    }),
    ['Quantity must be a non-negative integer.']
  );
});
