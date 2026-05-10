const assert = require('node:assert');
const test = require('node:test');

const {
  validateCategoryId,
  validateCategoryPayload,
} = require('../src/validators/categoryValidator');

test('category id validation requires a positive integer', () => {
  assert.deepEqual(validateCategoryId('0'), ['Category ID must be a positive integer.']);
  assert.deepEqual(validateCategoryId('abc'), ['Category ID must be a positive integer.']);
  assert.deepEqual(validateCategoryId('1'), []);
});

test('category payload validation accepts valid details', () => {
  const errors = validateCategoryPayload({
    name: 'Beverages',
    parentId: 1,
    description: 'Drinks and related items',
    status: 'active',
  });

  assert.deepEqual(errors, []);
});

test('category payload validation rejects invalid details', () => {
  const errors = validateCategoryPayload({
    name: '',
    parentId: 0,
    description: 123,
    status: 'archived',
  });

  assert.match(errors.join(' '), /Category name is required/);
  assert.match(errors.join(' '), /Category parent ID must be a positive integer/);
  assert.match(errors.join(' '), /Category description must be a string/);
  assert.match(errors.join(' '), /Category status must be active or inactive/);
});
