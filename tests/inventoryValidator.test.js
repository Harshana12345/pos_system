const assert = require('node:assert');
const test = require('node:test');

const {
  validateExpiringInventoryFilters,
  validateInventoryAdjustmentPayload,
  validateInventoryFilters,
  validateInventoryMovementFilters,
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

test('expiring inventory filter validation accepts branch and threshold days', () => {
  assert.deepEqual(validateExpiringInventoryFilters({}), []);
  assert.deepEqual(validateExpiringInventoryFilters({ branchId: '1', thresholdDays: '0' }), []);
  assert.deepEqual(validateExpiringInventoryFilters({ branch_id: '2', threshold_days: '30' }), []);
});

test('expiring inventory filter validation rejects invalid threshold days', () => {
  assert.deepEqual(validateExpiringInventoryFilters({ thresholdDays: '-1' }), [
    'Threshold days must be a non-negative integer.',
  ]);
  assert.deepEqual(validateExpiringInventoryFilters({ threshold_days: 'abc' }), [
    'Threshold days must be a non-negative integer.',
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

test('inventory movement filter validation accepts supported filters', () => {
  assert.deepEqual(
    validateInventoryMovementFilters({
      inventoryId: '1',
      product_id: '2',
      variantId: '3',
      branch_id: '4',
      adjustedByUserId: '5',
      dateFrom: '2026-05-01',
      date_to: '2026-05-10T12:00:00.000Z',
      limit: '25',
      offset: '0',
    }),
    []
  );
});

test('inventory movement filter validation rejects invalid filters', () => {
  assert.deepEqual(
    validateInventoryMovementFilters({
      inventoryId: '0',
      branchId: 'abc',
      createdFrom: '2026-05-10',
      createdTo: '2026-05-01',
      limit: '0',
      offset: '-1',
    }),
    [
      'Inventory ID must be a positive integer.',
      'Branch ID must be a positive integer.',
      'Created from must be before or equal to created to.',
      'Limit must be a positive integer.',
      'Offset must be a non-negative integer.',
    ]
  );
});
