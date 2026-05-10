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

function isValidDate(value) {
  if (value === null || value === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isOptionalString(value) {
  return value === undefined || value === null || typeof value === 'string';
}

function validatePayment(payment, label, errors) {
  if (!isPlainObject(payment)) {
    errors.push(`${label} details are required.`);
    return;
  }

  const referenceNumber = payment.referenceNumber ?? payment.reference_number;
  const paidAt = payment.paidAt ?? payment.paid_at;

  if (!isPositiveNumber(payment.amount)) {
    errors.push(`${label} amount must be a positive number.`);
  }

  if (!isOptionalString(payment.method)) {
    errors.push(`${label} method must be a string.`);
  }

  if (!isOptionalString(referenceNumber)) {
    errors.push(`${label} reference number must be a string.`);
  }

  if (!isOptionalString(payment.notes)) {
    errors.push(`${label} notes must be a string.`);
  }

  if (paidAt !== undefined && !isValidDate(paidAt)) {
    errors.push(`${label} date must be a valid date.`);
  }
}

function validateSaleFilters(filters = {}) {
  const errors = [];
  const branchId = filters.branchId ?? filters.branch_id;
  const cashierId =
    filters.cashierId ??
    filters.cashier_id ??
    filters.cashier ??
    filters.createdBy ??
    filters.created_by;
  const dateFrom =
    filters.dateFrom ??
    filters.date_from ??
    filters.startDate ??
    filters.start_date ??
    filters.createdFrom ??
    filters.created_from;
  const dateTo =
    filters.dateTo ??
    filters.date_to ??
    filters.endDate ??
    filters.end_date ??
    filters.createdTo ??
    filters.created_to;
  const status = filters.status;

  if (branchId !== undefined && !isPositiveInteger(branchId)) {
    errors.push('Branch ID must be a positive integer.');
  }

  if (cashierId !== undefined && !isPositiveInteger(cashierId)) {
    errors.push('Cashier ID must be a positive integer.');
  }

  if (status !== undefined && (typeof status !== 'string' || status.trim().length === 0)) {
    errors.push('Sale status must be a non-empty string.');
  }

  if (dateFrom !== undefined && !isValidDate(dateFrom)) {
    errors.push('Date from must be a valid date.');
  }

  if (dateTo !== undefined && !isValidDate(dateTo)) {
    errors.push('Date to must be a valid date.');
  }

  if (
    dateFrom !== undefined &&
    dateTo !== undefined &&
    isValidDate(dateFrom) &&
    isValidDate(dateTo) &&
    new Date(dateFrom) > new Date(dateTo)
  ) {
    errors.push('Date from must be before or equal to date to.');
  }

  return errors;
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
  const hasSplitPayments = payload.payments !== undefined;

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

  if (!hasSplitPayments && !isPositiveNumber(paidAmount)) {
    errors.push('Paid amount must be a positive number.');
  }

  if (hasSplitPayments) {
    if (!Array.isArray(payload.payments) || payload.payments.length === 0) {
      errors.push('At least one sale payment is required.');
    } else {
      payload.payments.forEach((payment, index) => {
        validatePayment(payment, `Payment ${index + 1}`, errors);
      });
    }
  } else {
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

    if (
      (payload.paidAt !== undefined && !isValidDate(payload.paidAt)) ||
      (payload.paid_at !== undefined && !isValidDate(payload.paid_at)) ||
      (payload.payment?.paidAt !== undefined && !isValidDate(payload.payment.paidAt)) ||
      (payload.payment?.paid_at !== undefined && !isValidDate(payload.payment.paid_at))
    ) {
      errors.push('Payment date must be a valid date.');
    }
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one sale item is required.');
    return errors;
  }

  validateSaleItems(payload.items, errors);

  return errors;
}

function validateSaleItems(items, errors) {
  items.forEach((item, index) => {
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
}

function validateSuspendedSalePayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Sale details are required.'];
  }

  const customerId = payload.customerId ?? payload.customer_id;
  const branchId = payload.branchId ?? payload.branch_id;

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

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one sale item is required.');
    return errors;
  }

  validateSaleItems(payload.items, errors);

  return errors;
}

function validateResumePayload(payload) {
  if (!isPlainObject(payload)) {
    return ['Suspended sale details are required.'];
  }

  const saleId = payload.saleId ?? payload.sale_id;

  return isPositiveInteger(saleId) ? [] : ['Sale ID must be a positive integer.'];
}

function validateRefundPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Refund details are required.'];
  }

  const saleId = payload.saleId ?? payload.sale_id;

  if (!isPositiveInteger(saleId)) {
    errors.push('Sale ID must be a positive integer.');
  }

  if (!isOptionalString(payload.reason)) {
    errors.push('Refund reason must be a string.');
  }

  if (!isOptionalString(payload.method ?? payload.refundMethod ?? payload.refund_method)) {
    errors.push('Refund method must be a string.');
  }

  if (
    !isOptionalString(
      payload.referenceNumber ?? payload.reference_number ?? payload.refundReferenceNumber
    )
  ) {
    errors.push('Refund reference number must be a string.');
  }

  if (!isOptionalString(payload.notes)) {
    errors.push('Refund notes must be a string.');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('At least one refund item is required.');
    return errors;
  }

  payload.items.forEach((item, index) => {
    const label = `Refund item ${index + 1}`;

    if (!isPlainObject(item)) {
      errors.push(`${label} details are required.`);
      return;
    }

    const saleItemId = item.saleItemId ?? item.sale_item_id;

    if (!isPositiveInteger(saleItemId)) {
      errors.push(`${label} sale item ID must be a positive integer.`);
    }

    if (!isPositiveInteger(item.quantity)) {
      errors.push(`${label} quantity must be a positive integer.`);
    }
  });

  return errors;
}

module.exports = {
  validateResumePayload,
  validateRefundPayload,
  validateSaleFilters,
  validateSalePayload,
  validateSuspendedSalePayload,
};
