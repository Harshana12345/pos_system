const VALID_CUSTOMER_STATUSES = new Set(['active', 'inactive']);

function isBlank(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0;
}

function isNonNegativeInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized >= 0;
}

function isNonNegativeNumber(value) {
  const normalized = Number(value);

  return Number.isFinite(normalized) && normalized >= 0;
}

function isPositiveNumber(value) {
  const normalized = Number(value);

  return Number.isFinite(normalized) && normalized > 0;
}

function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateCustomerId(id) {
  if (!isPositiveInteger(id)) {
    return ['Customer ID must be a positive integer.'];
  }

  return [];
}

function validateOptionalString(payload, key, label, errors) {
  if (
    payload[key] !== undefined &&
    payload[key] !== null &&
    typeof payload[key] !== 'string'
  ) {
    errors.push(`${label} must be a string.`);
  }
}

function validateCustomerPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Customer details are required.'];
  }

  const fullName = payload.fullName ?? payload.full_name;

  if (typeof fullName !== 'string' || isBlank(fullName)) {
    errors.push('Customer full name is required.');
  }

  validateOptionalString(payload, 'phone', 'Customer phone', errors);
  validateOptionalString(payload, 'email', 'Customer email', errors);
  validateOptionalString(payload, 'address', 'Customer address', errors);
  validateOptionalString(payload, 'notes', 'Customer notes', errors);

  const loyaltyPoints = payload.loyaltyPoints ?? payload.loyalty_points;

  if (loyaltyPoints !== undefined && !isNonNegativeInteger(loyaltyPoints)) {
    errors.push('Customer loyalty points must be a non-negative integer.');
  }

  const creditBalance = payload.creditBalance ?? payload.credit_balance;

  if (creditBalance !== undefined && !isNonNegativeNumber(creditBalance)) {
    errors.push('Customer credit balance must be a non-negative number.');
  }

  const dateOfBirth = payload.dateOfBirth ?? payload.date_of_birth;

  if (
    dateOfBirth !== undefined &&
    dateOfBirth !== null &&
    !isDateOnly(dateOfBirth)
  ) {
    errors.push('Customer date of birth must be a valid YYYY-MM-DD date.');
  }

  const customerGroupId = payload.customerGroupId ?? payload.customer_group_id;

  if (
    customerGroupId !== undefined &&
    customerGroupId !== null &&
    !isPositiveInteger(customerGroupId)
  ) {
    errors.push('Customer group ID must be a positive integer.');
  }

  if (payload.status !== undefined && !VALID_CUSTOMER_STATUSES.has(payload.status)) {
    errors.push('Customer status must be active or inactive.');
  }

  return errors;
}

function validateBirthdayPromotionQuery(query) {
  const errors = [];

  if (!isPlainObject(query)) {
    return errors;
  }

  if (
    query.daysAhead !== undefined &&
    (!isNonNegativeInteger(query.daysAhead) || Number(query.daysAhead) > 366)
  ) {
    errors.push('Birthday promotion days ahead must be an integer from 0 to 366.');
  }

  return errors;
}

function validateLoyaltyPointsPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Loyalty points adjustment is required.'];
  }

  if (!['add', 'redeem'].includes(payload.action)) {
    errors.push('Loyalty points action must be add or redeem.');
  }

  if (!isPositiveInteger(payload.points)) {
    errors.push('Loyalty points must be a positive integer.');
  }

  return errors;
}

function validateCreditBalancePayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Credit balance adjustment is required.'];
  }

  if (!['add', 'subtract'].includes(payload.action)) {
    errors.push('Credit balance action must be add or subtract.');
  }

  if (!isPositiveNumber(payload.amount)) {
    errors.push('Credit balance amount must be a positive number.');
  }

  return errors;
}

module.exports = {
  validateBirthdayPromotionQuery,
  validateCreditBalancePayload,
  validateCustomerId,
  validateCustomerPayload,
  validateLoyaltyPointsPayload,
};
