const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const VALID_EMPLOYEE_STATUSES = new Set(['active', 'inactive']);

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validateEmployeeId(id) {
  if (!isPositiveInteger(id)) {
    return ['Employee ID must be a positive integer.'];
  }

  return [];
}

function validateCreateEmployeePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Employee details are required.'];
  }

  if (!hasValue(payload.name)) {
    errors.push('Name is required.');
  }

  if (!hasValue(payload.email)) {
    errors.push('Email is required.');
  } else if (!EMAIL_PATTERN.test(String(payload.email).trim())) {
    errors.push('Email must be valid.');
  }

  if (!hasValue(payload.password)) {
    errors.push('Password is required.');
  } else if (String(payload.password).length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (!isPositiveInteger(payload.roleId)) {
    errors.push('Role ID must be a positive integer.');
  }

  if (!isPositiveInteger(payload.branchId)) {
    errors.push('Branch ID must be a positive integer.');
  }

  if (payload.salary !== undefined) {
    const salary = Number(payload.salary);

    if (!Number.isFinite(salary) || salary < 0) {
      errors.push('Salary must be a non-negative number.');
    }
  }

  if (payload.shift !== undefined && payload.shift !== null && typeof payload.shift !== 'string') {
    errors.push('Shift must be a string.');
  }

  if (
    payload.attendance !== undefined &&
    (payload.attendance === null ||
      typeof payload.attendance !== 'object' ||
      Array.isArray(payload.attendance))
  ) {
    errors.push('Attendance must be an object.');
  }

  if (payload.status !== undefined && !VALID_EMPLOYEE_STATUSES.has(payload.status)) {
    errors.push('Employee status must be active or inactive.');
  }

  return errors;
}

function validateUpdateEmployeePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Employee details are required.'];
  }

  if (!hasValue(payload.name)) {
    errors.push('Name is required.');
  }

  if (!hasValue(payload.email)) {
    errors.push('Email is required.');
  } else if (!EMAIL_PATTERN.test(String(payload.email).trim())) {
    errors.push('Email must be valid.');
  }

  if (!isPositiveInteger(payload.roleId)) {
    errors.push('Role ID must be a positive integer.');
  }

  if (!isPositiveInteger(payload.branchId)) {
    errors.push('Branch ID must be a positive integer.');
  }

  if (payload.salary !== undefined) {
    const salary = Number(payload.salary);

    if (!Number.isFinite(salary) || salary < 0) {
      errors.push('Salary must be a non-negative number.');
    }
  }

  if (payload.shift !== undefined && payload.shift !== null && typeof payload.shift !== 'string') {
    errors.push('Shift must be a string.');
  }

  if (
    payload.attendance !== undefined &&
    (payload.attendance === null ||
      typeof payload.attendance !== 'object' ||
      Array.isArray(payload.attendance))
  ) {
    errors.push('Attendance must be an object.');
  }

  if (payload.status !== undefined && !VALID_EMPLOYEE_STATUSES.has(payload.status)) {
    errors.push('Employee status must be active or inactive.');
  }

  return errors;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  validateCreateEmployeePayload,
  validateEmployeeId,
  validateUpdateEmployeePayload,
};
