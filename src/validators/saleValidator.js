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

function isPositiveNumber(value) {
  const normalized = Number(value);

  return Number.isFinite(normalized) && normalized > 0;
}

function isOptionalString(value) {
  return value === undefined || value === null || typeof value === 'string';
}

function validateSalePayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Sale details are required.'];
  }

  const customerId = payload.customerId ?? payload.customer_id;
  const branchId = payload.branchId ?? payload.branch_id;
  const paidAmount =
    payload.paidAmount ?? payload.paid_amount ?? payload.payment?.amount;

  if (customerId !== undefined && customerId !== null && customerId !== '') {
    if (!isPositiveInteger(customerId)) {
      errors.push('Customer ID must be a positive integer.');
    }
  }

  if (!isPositiveInteger(branchId)) {
    errors.push('Branch ID must be a positive integer.');
  }

  if (!isNonNegativeNumber(payload.discountAmount ?? payload.discount_amount ?? 0)) {
    errors.push('Sale discount amount must be a non-negative number.');
  }

  if (!isNonNegativeNumber(payload.taxAmount ?? payload.tax_amount ?? 0)) {
    errors.push('Sale tax amount must be a non-negative number.');
  }

  if (!isPositiveNumber(paidAmount)) {
    errors.push('Paid amount must be a positive number.');
  }

  if (
    !isOptionalString(payload.paymentMethod ?? payload.payment_method ?? payload.payment?.method)
  ) {
    errors.push('Payment method must be a string.');
  }

  if (
    !isOptionalString(
      payload.paymentReferenceNumber ??
        payload.payment_reference_number ??
        payload.payment?.referenceNumber ??
        payload.payment?.reference_number
    )
  ) {
    errors.push('Payment reference number must be a string.');
  }

  if (
    !isOptionalString(payload.paymentNotes ?? payload.payment_notes ?? payload.payment?.notes)
  ) {
    errors.push('Payment notes must be a string.');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one sale item is required.');
    return errors;
  }

  payload.items.forEach((item, index) => {
    const label = `Sale item ${index + 1}`;

    if (!isPlainObject(item)) {
      errors.push(`${label} details are required.`);
      return;
    }

    const productId = item.productId ?? item.product_id;
    const variantId = item.variantId ?? item.variant_id;
    const unitPrice = item.unitPrice ?? item.unit_price;
    const discountAmount = item.discountAmount ?? item.discount_amount ?? 0;

    if (!isPositiveInteger(productId)) {
      errors.push(`${label} product ID must be a positive integer.`);
    }

    if (variantId !== undefined && variantId !== null && variantId !== '') {
      if (!isPositiveInteger(variantId)) {
        errors.push(`${label} variant ID must be a positive integer.`);
      }
    }

    if (!isPositiveInteger(item.quantity)) {
      errors.push(`${label} quantity must be a positive integer.`);
    }

    if (!isNonNegativeNumber(unitPrice)) {
      errors.push(`${label} unit price must be a non-negative number.`);
    }

    if (!isNonNegativeNumber(discountAmount)) {
      errors.push(`${label} discount amount must be a non-negative number.`);
    }
  });

  return errors;
}

module.exports = {
  validateSalePayload,
};
