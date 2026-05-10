const VALID_CATEGORY_STATUSES = new Set(['active', 'inactive']);

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

function validateCategoryId(id) {
  if (!isPositiveInteger(id)) {
    return ['Category ID must be a positive integer.'];
  }

  return [];
}

function validateCategoryPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Category details are required.'];
  }

  if (typeof payload.name !== 'string' || isBlank(payload.name)) {
    errors.push('Category name is required.');
  }

  const parentId = payload.parentId ?? payload.parent_id;

  if (parentId !== undefined && parentId !== null && !isPositiveInteger(parentId)) {
    errors.push('Category parent ID must be a positive integer.');
  }

  if (
    payload.description !== undefined &&
    payload.description !== null &&
    typeof payload.description !== 'string'
  ) {
    errors.push('Category description must be a string.');
  }

  if (payload.status !== undefined && !VALID_CATEGORY_STATUSES.has(payload.status)) {
    errors.push('Category status must be active or inactive.');
  }

  return errors;
}

module.exports = {
  validateCategoryId,
  validateCategoryPayload,
};
