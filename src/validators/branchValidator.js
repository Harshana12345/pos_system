const VALID_BRANCH_STATUSES = new Set(['active', 'inactive']);

function isBlank(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

function validateBranchId(id) {
  const branchId = Number(id);

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return ['Branch ID must be a positive integer.'];
  }

  return [];
}

function validateUpdateBranchPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Branch details are required.'];
  }

  if (typeof payload.name !== 'string' || isBlank(payload.name)) {
    errors.push('Branch name is required.');
  }

  if (payload.currency !== undefined) {
    const currency = String(payload.currency).trim();

    if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push('Branch currency must be a 3-letter uppercase ISO code.');
    }
  }

  if (payload.status !== undefined && !VALID_BRANCH_STATUSES.has(payload.status)) {
    errors.push('Branch status must be active or inactive.');
  }

  return errors;
}

module.exports = { validateBranchId, validateUpdateBranchPayload };
