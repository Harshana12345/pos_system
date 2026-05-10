const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validateRegisterPayload(payload) {
  const errors = [];

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

  return errors;
}

function validateLoginPayload(payload) {
  const errors = [];

  if (!hasValue(payload.email)) {
    errors.push('Email is required.');
  } else if (!EMAIL_PATTERN.test(String(payload.email).trim())) {
    errors.push('Email must be valid.');
  }

  if (!hasValue(payload.password)) {
    errors.push('Password is required.');
  }

  return errors;
}

function validateRefreshPayload(payload) {
  const errors = [];

  if (!hasValue(payload.refreshToken)) {
    errors.push('Refresh token is required.');
  }

  return errors;
}

function validateForgotPasswordPayload(payload) {
  const errors = [];

  if (!hasValue(payload.email)) {
    errors.push('Email is required.');
  } else if (!EMAIL_PATTERN.test(String(payload.email).trim())) {
    errors.push('Email must be valid.');
  }

  return errors;
}

function validateResetPasswordPayload(payload) {
  const errors = [];

  if (!hasValue(payload.token)) {
    errors.push('Reset token is required.');
  }

  if (!hasValue(payload.password)) {
    errors.push('Password is required.');
  } else if (String(payload.password).length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return errors;
}

function validateLogoutPayload(payload) {
  return validateRefreshPayload(payload);
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateLogoutPayload,
  validateRefreshPayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
};
