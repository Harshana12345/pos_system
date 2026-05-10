const assert = require('node:assert');
const test = require('node:test');

const {
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateLogoutPayload,
  validateRefreshPayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
  validateVerifyEmailPayload,
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

test('forgot password payload validation requires a valid email', () => {
  assert.deepEqual(validateForgotPasswordPayload({}), ['Email is required.']);
  assert.deepEqual(validateForgotPasswordPayload({ email: 'not-an-email' }), [
    'Email must be valid.',
  ]);
});

test('forgot password payload validation accepts a valid email', () => {
  const errors = validateForgotPasswordPayload({
    email: 'admin@example.com',
  });

  assert.deepEqual(errors, []);
});

test('reset password payload validation requires token and valid password', () => {
  assert.deepEqual(validateResetPasswordPayload({}), [
    'Reset token is required.',
    'Password is required.',
  ]);
  assert.deepEqual(validateResetPasswordPayload({ token: 'reset-token', password: 'short' }), [
    'Password must be at least 8 characters.',
  ]);
});

test('reset password payload validation accepts a token and valid password', () => {
  const errors = validateResetPasswordPayload({
    token: 'reset-token',
    password: 'password123',
  });

  assert.deepEqual(errors, []);
});

test('verify email payload validation requires token', () => {
  const errors = validateVerifyEmailPayload({});

  assert.deepEqual(errors, ['Verification token is required.']);
});

test('verify email payload validation accepts a token', () => {
  const errors = validateVerifyEmailPayload({
    token: 'verification-token',
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

test('logout payload validation requires refresh token', () => {
  const errors = validateLogoutPayload({});

  assert.deepEqual(errors, ['Refresh token is required.']);
});

test('logout payload validation accepts a refresh token', () => {
  const errors = validateLogoutPayload({
    refreshToken: 'refresh-token',
  });

  assert.deepEqual(errors, []);
});
