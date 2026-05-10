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

function isValidDate(value) {
  if (value === null || value === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isInteger(value) {
  return Number.isInteger(Number(value));
}

function isPositiveInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0;
}

function isNonNegativeInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized >= 0;
}

function validateInventoryMovementFilters(filters = {}) {
  const errors = [];
  const positiveIntegerFilters = [
    ['inventoryId', 'inventory_id', 'Inventory ID'],
    ['productId', 'product_id', 'Product ID'],
    ['variantId', 'variant_id', 'Variant ID'],
    ['branchId', 'branch_id', 'Branch ID'],
    ['adjustedByUserId', 'adjusted_by_user_id', 'Adjusted by user ID'],
  ];

  positiveIntegerFilters.forEach(([camelKey, snakeKey, label]) => {
    const value = filters[camelKey] ?? filters[snakeKey];

    if (value !== undefined && !isPositiveInteger(value)) {
      errors.push(`${label} must be a positive integer.`);
    }
  });

  const createdFrom =
    filters.createdFrom ?? filters.created_from ?? filters.dateFrom ?? filters.date_from;
  const createdTo = filters.createdTo ?? filters.created_to ?? filters.dateTo ?? filters.date_to;

  if (createdFrom !== undefined && !isValidDate(createdFrom)) {
    errors.push('Created from must be a valid date.');
  }

  if (createdTo !== undefined && !isValidDate(createdTo)) {
    errors.push('Created to must be a valid date.');
  }

  if (
    createdFrom !== undefined &&
    createdTo !== undefined &&
    isValidDate(createdFrom) &&
    isValidDate(createdTo) &&
    new Date(createdFrom) > new Date(createdTo)
  ) {
    errors.push('Created from must be before or equal to created to.');
  }

  if (filters.limit !== undefined && !isPositiveInteger(filters.limit)) {
    errors.push('Limit must be a positive integer.');
  }

  if (filters.offset !== undefined && !isNonNegativeInteger(filters.offset)) {
    errors.push('Offset must be a non-negative integer.');
  }

  return errors;
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

module.exports = {
  validateInventoryAdjustmentPayload,
  validateInventoryFilters,
  validateInventoryMovementFilters,
};
