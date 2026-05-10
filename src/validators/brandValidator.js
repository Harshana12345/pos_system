const VALID_BRAND_STATUSES = new Set(['active', 'inactive']);

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

function validateBrandId(id) {
  if (!isPositiveInteger(id)) {
    return ['Brand ID must be a positive integer.'];
  }

  return [];
}

function validateBrandPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Brand details are required.'];
  }

  if (typeof payload.name !== 'string' || isBlank(payload.name)) {
    errors.push('Brand name is required.');
  }

  if (
    payload.description !== undefined &&
    payload.description !== null &&
    typeof payload.description !== 'string'
  ) {
    errors.push('Brand description must be a string.');
  }

  if (payload.status !== undefined && !VALID_BRAND_STATUSES.has(payload.status)) {
    errors.push('Brand status must be active or inactive.');
  }

  return errors;
}

module.exports = {
  validateBrandId,
  validateBrandPayload,
};
