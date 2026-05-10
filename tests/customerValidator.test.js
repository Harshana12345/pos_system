const assert = require('node:assert');
const test = require('node:test');

const {
  validateCreditBalancePayload,
  validateCustomerId,
  validateCustomerPayload,
  validateLoyaltyPointsPayload,
} = require('../src/validators/customerValidator');

test('customer id validation requires a positive integer', () => {
  assert.deepEqual(validateCustomerId('0'), ['Customer ID must be a positive integer.']);
  assert.deepEqual(validateCustomerId('abc'), [
    'Customer ID must be a positive integer.',
  ]);
  assert.deepEqual(validateCustomerId('1'), []);
});

test('customer payload validation accepts valid details', () => {
  const errors = validateCustomerPayload({
    fullName: 'Jane Perera',
    phone: '+94112223344',
    email: 'jane@example.com',
    address: '12 Main Street',
    loyaltyPoints: 10,
    creditBalance: '25.50',
    notes: 'Prefers SMS',
    status: 'active',
    customerGroupId: 1,
  });

  assert.deepEqual(errors, []);
});

test('customer payload validation rejects invalid details', () => {
  const errors = validateCustomerPayload({
    fullName: '',
    phone: 123,
    loyaltyPoints: -1,
    creditBalance: -10,
    status: 'archived',
    customerGroupId: 0,
  });

  assert.match(errors.join(' '), /Customer full name is required/);
  assert.match(errors.join(' '), /Customer phone must be a string/);
  assert.match(errors.join(' '), /Customer loyalty points must be a non-negative integer/);
  assert.match(errors.join(' '), /Customer credit balance must be a non-negative number/);
  assert.match(errors.join(' '), /Customer status must be active or inactive/);
  assert.match(errors.join(' '), /Customer group ID must be a positive integer/);
});

test('loyalty points payload validation accepts add and redeem actions', () => {
  assert.deepEqual(validateLoyaltyPointsPayload({ action: 'add', points: 10 }), []);
  assert.deepEqual(validateLoyaltyPointsPayload({ action: 'redeem', points: '5' }), []);
});

test('loyalty points payload validation rejects invalid adjustments', () => {
  assert.deepEqual(validateLoyaltyPointsPayload(null), [
    'Loyalty points adjustment is required.',
  ]);

  const errors = validateLoyaltyPointsPayload({
    action: 'replace',
    points: 0,
  });

  assert.match(errors.join(' '), /Loyalty points action must be add or redeem/);
  assert.match(errors.join(' '), /Loyalty points must be a positive integer/);
});

test('credit balance payload validation accepts add and subtract actions', () => {
  assert.deepEqual(validateCreditBalancePayload({ action: 'add', amount: 10 }), []);
  assert.deepEqual(
    validateCreditBalancePayload({ action: 'subtract', amount: '5.50' }),
    []
  );
});

test('credit balance payload validation rejects invalid adjustments', () => {
  assert.deepEqual(validateCreditBalancePayload(null), [
    'Credit balance adjustment is required.',
  ]);

  const errors = validateCreditBalancePayload({
    action: 'replace',
    amount: 0,
  });

  assert.match(errors.join(' '), /Credit balance action must be add or subtract/);
  assert.match(errors.join(' '), /Credit balance amount must be a positive number/);
});
