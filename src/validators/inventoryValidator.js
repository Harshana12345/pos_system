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

function isInteger(value) {
  return Number.isInteger(Number(value));
}

function validateInventoryAdjustmentPayload(payload = {}) {
  const errors = [];
  const inventoryId = payload.inventoryId ?? payload.inventory_id;
  const quantity = payload.quantity;
  const quantityChange = payload.quantityChange ?? payload.quantity_change ?? payload.adjustment;
  const reason = payload.reason;

  if (!isInteger(inventoryId) || Number(inventoryId) <= 0) {
    errors.push('Inventory ID must be a positive integer.');
  }

  if (quantity === undefined && quantityChange === undefined) {
    errors.push('Quantity or quantity change is required.');
  }

  if (quantity !== undefined && quantityChange !== undefined) {
    errors.push('Provide either quantity or quantity change, not both.');
  }

  if (quantity !== undefined && (!isInteger(quantity) || Number(quantity) < 0)) {
    errors.push('Quantity must be a non-negative integer.');
  }

  if (quantityChange !== undefined && !isInteger(quantityChange)) {
    errors.push('Quantity change must be an integer.');
  }

  if (typeof reason !== 'string' || reason.trim().length === 0) {
    errors.push('Reason is required.');
  }

  return errors;
}

module.exports = { validateInventoryAdjustmentPayload, validateInventoryFilters };
