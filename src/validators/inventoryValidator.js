function validateInventoryFilters(filters = {}) {
  const errors = [];
  const branchId = filters.branchId ?? filters.branch_id;

  if (branchId !== undefined) {
    const normalizedBranchId = Number(branchId);

    if (!Number.isInteger(normalizedBranchId) || normalizedBranchId <= 0) {
      errors.push('Branch ID must be a positive integer.');
    }
  }

  return errors;
}

module.exports = { validateInventoryFilters };
