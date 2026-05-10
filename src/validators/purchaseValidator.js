const VALID_PURCHASE_STATUSES = new Set(['draft', 'ordered', 'received', 'cancelled']);

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

function validatePurchasePayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Purchase order details are required.'];
  }

  const supplierId = payload.supplierId ?? payload.supplier_id;
  const branchId = payload.branchId ?? payload.branch_id;

  if (!isPositiveInteger(supplierId)) {
    errors.push('Supplier ID must be a positive integer.');
  }

  if (!isPositiveInteger(branchId)) {
    errors.push('Branch ID must be a positive integer.');
  }

  if (payload.status !== undefined && !VALID_PURCHASE_STATUSES.has(payload.status)) {
    errors.push('Purchase status must be draft, ordered, received, or cancelled.');
  }

  if (
    payload.notes !== undefined &&
    payload.notes !== null &&
    typeof payload.notes !== 'string'
  ) {
    errors.push('Purchase notes must be a string.');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one purchase item is required.');
    return errors;
  }

  payload.items.forEach((item, index) => {
    const label = `Purchase item ${index + 1}`;

    if (!isPlainObject(item)) {
      errors.push(`${label} details are required.`);
      return;
    }

    const productId = item.productId ?? item.product_id;
    const costPrice = item.costPrice ?? item.cost_price;

    if (!isPositiveInteger(productId)) {
      errors.push(`${label} product ID must be a positive integer.`);
    }

    if (!isPositiveInteger(item.quantity)) {
      errors.push(`${label} quantity must be a positive integer.`);
    }

    if (!isNonNegativeNumber(costPrice)) {
      errors.push(`${label} cost price must be a non-negative number.`);
    }
  });

  return errors;
}

module.exports = {
  validatePurchasePayload,
};
