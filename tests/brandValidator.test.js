const assert = require('node:assert');
const test = require('node:test');

const {
  validateBrandId,
  validateBrandPayload,
} = require('../src/validators/brandValidator');

test('brand id validation requires a positive integer', () => {
  assert.deepEqual(validateBrandId('0'), ['Brand ID must be a positive integer.']);
  assert.deepEqual(validateBrandId('abc'), ['Brand ID must be a positive integer.']);
  assert.deepEqual(validateBrandId('1'), []);
});

test('brand payload validation accepts valid details', () => {
  const errors = validateBrandPayload({
    name: 'Acme',
    description: 'Retail products',
    status: 'active',
  });

  assert.deepEqual(errors, []);
});

test('brand payload validation rejects invalid details', () => {
  const errors = validateBrandPayload({
    name: '',
    description: 123,
    status: 'archived',
  });

  assert.match(errors.join(' '), /Brand name is required/);
  assert.match(errors.join(' '), /Brand description must be a string/);
  assert.match(errors.join(' '), /Brand status must be active or inactive/);
});
