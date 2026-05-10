const assert = require('node:assert');
const test = require('node:test');

const {
  validateLoginPayload,
  validateRefreshPayload,
  validateRegisterPayload,
} = require('../src/validators/authValidator');

test('register payload validation requires expected fields', () => {
  const errors = validateRegisterPayload({});

  assert.deepEqual(errors, [
    'Name is required.',
    'Email is required.',
    'Password is required.',
    'Role ID must be a positive integer.',
    'Branch ID must be a positive integer.',
  ]);
});

test('register payload validation accepts a valid payload', () => {
  const errors = validateRegisterPayload({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    roleId: 1,
    branchId: 1,
  });

  assert.deepEqual(errors, []);
});

test('login payload validation requires expected fields', () => {
  const errors = validateLoginPayload({});

  assert.deepEqual(errors, ['Email is required.', 'Password is required.']);
});

test('login payload validation accepts a valid payload', () => {
  const errors = validateLoginPayload({
    email: 'admin@example.com',
    password: 'password123',
  });

  assert.deepEqual(errors, []);
});

test('refresh payload validation requires refresh token', () => {
  const errors = validateRefreshPayload({});

  assert.deepEqual(errors, ['Refresh token is required.']);
});

test('refresh payload validation accepts a refresh token', () => {
  const errors = validateRefreshPayload({
    refreshToken: 'refresh-token',
  });

  assert.deepEqual(errors, []);
});
