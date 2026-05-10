const VALID_SUPPLIER_STATUSES = new Set(['active', 'inactive']);

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

function isNonNegativeNumber(value) {
  const normalized = Number(value);

  return Number.isFinite(normalized) && normalized >= 0;
}

function validateSupplierId(id) {
  if (!isPositiveInteger(id)) {
    return ['Supplier ID must be a positive integer.'];
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

function validateSupplierPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Supplier details are required.'];
  }

  if (typeof payload.name !== 'string' || isBlank(payload.name)) {
    errors.push('Supplier name is required.');
  }

  validateOptionalString(payload, 'contactNumber', 'Supplier contact number', errors);
  validateOptionalString(payload, 'contact_number', 'Supplier contact number', errors);
  validateOptionalString(payload, 'email', 'Supplier email', errors);
  validateOptionalString(payload, 'address', 'Supplier address', errors);
  validateOptionalString(payload, 'taxId', 'Supplier tax ID', errors);
  validateOptionalString(payload, 'tax_id', 'Supplier tax ID', errors);
  validateOptionalString(payload, 'notes', 'Supplier notes', errors);

  if (payload.balance !== undefined && !isNonNegativeNumber(payload.balance)) {
    errors.push('Supplier balance must be a non-negative number.');
  }

  if (payload.status !== undefined && !VALID_SUPPLIER_STATUSES.has(payload.status)) {
    errors.push('Supplier status must be active or inactive.');
  }

  return errors;
}

module.exports = {
  validateSupplierId,
  validateSupplierPayload,
};
