const database = require('../config/database');
const { env } = require('../config/env');
const smsService = require('./smsService');
const HttpError = require('../utils/httpError');

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value);
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizePaymentDate(value) {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  return new Date(value);
}

function normalizePaymentPayload(payment) {
  const amount = roundCurrency(Number(payment.amount));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'Payment amount must be a positive number.');
  }

  return {
    amount,
    method: normalizeNullableString(payment.method),
    referenceNumber: normalizeNullableString(
      payment.referenceNumber ?? payment.reference_number
    ),
    notes: normalizeNullableString(payment.notes),
    paidAt: normalizePaymentDate(payment.paidAt ?? payment.paid_at),
  };
}

function calculateLoyaltyPointsEarned(totalAmount, rules = env.loyalty) {
  if (!rules?.pointsEnabled) {
    return 0;
  }

  const spendAmountPerPoint = Number(rules.spendAmountPerPoint);

  if (!Number.isFinite(spendAmountPerPoint) || spendAmountPerPoint <= 0) {
    return 0;
  }

  const normalizedTotalAmount = Number(totalAmount);

  if (!Number.isFinite(normalizedTotalAmount) || normalizedTotalAmount <= 0) {
    return 0;
  }

  const rawPoints = normalizedTotalAmount / spendAmountPerPoint;
  const rounding = String(rules.rounding || 'floor').trim().toLowerCase();
  const points =
    rounding === 'ceil'
      ? Math.ceil(rawPoints)
      : rounding === 'round'
        ? Math.round(rawPoints)
        : Math.floor(rawPoints);

  return Number.isFinite(points) ? Math.max(0, points) : 0;
}

async function awardLoyaltyPoints(client, customerId, saleTotal) {
  if (customerId === null || customerId === undefined) {
    return 0;
  }

  const pointsEarned = calculateLoyaltyPointsEarned(saleTotal);

  if (pointsEarned <= 0) {
    return 0;
  }

  await client.query(
    `UPDATE customers
     SET loyalty_points = loyalty_points + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [customerId, pointsEarned]
  );

  return pointsEarned;
}

function normalizeDiscountType(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['fixed', 'fixed_amount', 'amount'].includes(normalized)) {
    return 'fixed';
  }

  if (['percentage', 'percent'].includes(normalized)) {
    return 'percentage';
  }

  throw new HttpError(400, `${label} discount type must be fixed or percentage.`);
}

function normalizeDiscountAmount(payload, baseAmount, label) {
  const discount =
    payload.discount && typeof payload.discount === 'object' ? payload.discount : {};
  const type = normalizeDiscountType(
    payload.discountType ?? payload.discount_type ?? discount.type,
    label
  );
  const rawValue =
    payload.discountValue ??
    payload.discount_value ??
    discount.value ??
    payload.discountAmount ??
    payload.discount_amount ??
    discount.amount ??
    0;
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(400, `${label} discount value must be a non-negative number.`);
  }

  if (type === 'percentage') {
    if (value > 100) {
      throw new HttpError(400, `${label} discount percentage cannot exceed 100.`);
    }

    return roundCurrency((baseAmount * value) / 100);
  }

  return roundCurrency(value);
}

function normalizeTaxRate(value) {
  const normalized = Number(value ?? 0);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new HttpError(400, 'Product tax rate must be a non-negative number.');
  }

  return normalized;
}

async function findProductTaxRates(client, items) {
  const productIds = [
    ...new Set(items.map((item) => Number(item.productId ?? item.product_id))),
  ];

  const result = await client.query(
    `SELECT id,
            tax_rate
     FROM products
     WHERE id = ANY($1::bigint[])
       AND deleted_at IS NULL`,
    [productIds]
  );

  if (result.rowCount !== productIds.length) {
    throw new HttpError(404, 'Product not found.');
  }

  return new Map(result.rows.map((row) => [String(row.id), normalizeTaxRate(row.tax_rate)]));
}

function normalizeSaleFilters(filters = {}) {
  return {
    branchId: filters.branchId ?? filters.branch_id,
    cashierId:
      filters.cashierId ??
      filters.cashier_id ??
      filters.cashier ??
      filters.createdBy ??
      filters.created_by,
    status: filters.status,
    dateFrom:
      filters.dateFrom ??
      filters.date_from ??
      filters.startDate ??
      filters.start_date ??
      filters.createdFrom ??
      filters.created_from,
    dateTo:
      filters.dateTo ??
      filters.date_to ??
      filters.endDate ??
      filters.end_date ??
      filters.createdTo ??
      filters.created_to,
  };
}

function normalizeSalePayload(payload, productTaxRates) {
  const draft = normalizeSaleDraftPayload(payload, productTaxRates);
  let payments;

  if (payload.payments !== undefined) {
    if (!Array.isArray(payload.payments) || payload.payments.length === 0) {
      throw new HttpError(400, 'At least one sale payment is required.');
    }

    payments = payload.payments.map(normalizePaymentPayload);
  } else {
    payments = [
      normalizePaymentPayload({
        amount: payload.paidAmount ?? payload.paid_amount ?? payload.payment?.amount,
        method: payload.paymentMethod ?? payload.payment_method ?? payload.payment?.method,
        referenceNumber:
          payload.paymentReferenceNumber ??
          payload.payment_reference_number ??
          payload.payment?.referenceNumber ??
          payload.payment?.reference_number,
        notes: payload.paymentNotes ?? payload.payment_notes ?? payload.payment?.notes,
        paidAt: payload.paidAt ?? payload.paid_at ?? payload.payment?.paidAt,
      }),
    ];
  }

  const paidAmount = roundCurrency(
    payments.reduce((sum, payment) => sum + payment.amount, 0)
  );

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new HttpError(400, 'Paid amount must be a positive number.');
  }

  if (paidAmount < draft.totalAmount) {
    throw new HttpError(400, 'Paid amount must cover the completed sale total.');
  }

  return {
    ...draft,
    paidAmount,
    balanceAmount: roundCurrency(Math.max(draft.totalAmount - paidAmount, 0)),
    payments,
  };
}

function normalizeSaleDraftPayload(payload, productTaxRates = new Map()) {
  const items = payload.items.map((item) => {
    const productId = Number(item.productId ?? item.product_id);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice ?? item.unit_price);
    const grossAmount = roundCurrency(quantity * unitPrice);
    const discountAmount = normalizeDiscountAmount(item, grossAmount, 'Sale item');
    const lineTotal = roundCurrency(grossAmount - discountAmount);
    const taxRate = normalizeTaxRate(
      productTaxRates.get(String(productId)) ?? item.taxRate ?? item.tax_rate ?? 0
    );
    const taxAmount = roundCurrency((lineTotal * taxRate) / 100);

    if (lineTotal < 0) {
      throw new HttpError(400, 'Sale item discount cannot exceed line amount.');
    }

    return {
      productId,
      variantId: normalizeNullableInteger(item.variantId ?? item.variant_id),
      quantity,
      unitPrice,
      discountAmount,
      taxRate,
      taxAmount,
      lineTotal,
    };
  });
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = normalizeDiscountAmount(payload, subtotal, 'Sale');
  const taxAmount = roundCurrency(items.reduce((sum, item) => sum + item.taxAmount, 0));
  const totalAmount = roundCurrency(subtotal - discountAmount + taxAmount);

  if (totalAmount < 0) {
    throw new HttpError(400, 'Sale discount cannot exceed sale subtotal plus tax.');
  }

  return {
    customerId: normalizeNullableInteger(payload.customerId ?? payload.customer_id),
    branchId: Number(payload.branchId ?? payload.branch_id),
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    items,
  };
}

function normalizeRefundPayload(payload) {
  return {
    saleId: Number(payload.saleId ?? payload.sale_id),
    reason: normalizeNullableString(payload.reason),
    method: normalizeNullableString(
      payload.method ?? payload.refundMethod ?? payload.refund_method
    ),
    referenceNumber: normalizeNullableString(
      payload.referenceNumber ??
        payload.reference_number ??
        payload.refundReferenceNumber ??
        payload.refund_reference_number
    ),
    notes: normalizeNullableString(payload.notes),
    items: payload.items.map((item) => ({
      saleItemId: Number(item.saleItemId ?? item.sale_item_id),
      quantity: Number(item.quantity),
    })),
  };
}

function mapSaleItemRow(row) {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    variantId: row.variant_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discountAmount: Number(row.discount_amount),
    lineTotal: Number(row.line_total),
  };
}

function mapRefundItemRow(row) {
  return {
    id: row.id,
    refundId: row.refund_id,
    saleItemId: row.sale_item_id,
    quantity: Number(row.quantity),
    amount: Number(row.amount),
  };
}

function mapRefundRow(row, items = []) {
  return {
    id: row.id,
    saleId: row.sale_id,
    amount: Number(row.amount),
    reason: row.reason,
    method: row.method,
    referenceNumber: row.reference_number,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items,
  };
}

function mapSaleRow(row, items = []) {
  return {
    id: row.id,
    customerId: row.customer_id,
    branchId: row.branch_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    balanceAmount: Number(row.balance_amount),
    paymentStatus: row.payment_status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items,
    payment: {
      amount: Number(row.paid_amount),
      status: row.payment_status,
      balanceAmount: Number(row.balance_amount),
    },
  };
}

function mapAdjustmentRow(row) {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    productId: row.product_id,
    variantId: row.variant_id,
    branchId: row.branch_id,
    previousQuantity: Number(row.previous_quantity),
    newQuantity: Number(row.new_quantity),
    quantityChange: Number(row.quantity_change),
    reason: row.reason,
    adjustedByUserId: row.adjusted_by_user_id,
    createdAt: row.created_at,
  };
}

function mapPaymentRow(row) {
  return {
    id: row.id,
    saleId: row.sale_id,
    amount: Number(row.amount),
    method: row.method,
    referenceNumber: row.reference_number,
    notes: row.notes,
    paidAt: row.paid_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function formatCurrency(amount, currency) {
  const normalizedAmount = Number(amount);

  return `${currency || 'USD'} ${normalizedAmount.toFixed(2)}`;
}

function buildReceiptSmsMessage({ sale, items, currency }) {
  const itemSummary = items
    .slice(0, 3)
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ');
  const extraItems = items.length > 3 ? ` +${items.length - 3} more` : '';
  const parts = [
    `Receipt #${sale.id}`,
    itemSummary ? `${itemSummary}${extraItems}` : null,
    `Total ${formatCurrency(sale.totalAmount, currency)}`,
    `Paid ${formatCurrency(sale.paidAmount, currency)}`,
  ];

  if (sale.balanceAmount > 0) {
    parts.push(`Balance ${formatCurrency(sale.balanceAmount, currency)}`);
  }

  return parts.filter(Boolean).join('. ');
}

function mapForeignKeyError(error) {
  if (error.code !== '23503') {
    return error;
  }

  if (error.constraint?.includes('customer')) {
    return new HttpError(404, 'Customer not found.');
  }

  if (error.constraint?.includes('branch')) {
    return new HttpError(404, 'Branch not found.');
  }

  if (error.constraint?.includes('product')) {
    return new HttpError(404, 'Product not found.');
  }

  if (error.constraint?.includes('variant')) {
    return new HttpError(404, 'Product variant not found.');
  }

  return new HttpError(400, 'Sale references an invalid record.');
}

async function deductInventoryItem(client, requester, saleId, branchId, item) {
  const inventoryResult = await client.query(
    `SELECT id,
            product_id,
            variant_id,
            branch_id,
            quantity
     FROM inventory
     WHERE product_id = $1
       AND branch_id = $2
       AND (
         ($3::bigint IS NULL AND variant_id IS NULL)
         OR variant_id = $3
       )
     FOR UPDATE`,
    [item.productId, branchId, item.variantId]
  );

  if (inventoryResult.rowCount === 0) {
    throw new HttpError(404, 'Inventory item not found.');
  }

  const inventory = inventoryResult.rows[0];
  const previousQuantity = Number(inventory.quantity);
  const newQuantity = previousQuantity - item.quantity;

  if (newQuantity < 0) {
    throw new HttpError(400, 'Insufficient stock for sale item.');
  }

  await client.query(
    `UPDATE inventory
     SET quantity = $2,
         last_updated = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [inventory.id, newQuantity]
  );

  const adjustmentResult = await client.query(
    `INSERT INTO inventory_adjustments (
       inventory_id,
       product_id,
       variant_id,
       branch_id,
       previous_quantity,
       new_quantity,
       quantity_change,
       reason,
       adjusted_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id,
               inventory_id,
               product_id,
               variant_id,
               branch_id,
               previous_quantity,
               new_quantity,
               quantity_change,
               reason,
               adjusted_by_user_id,
               created_at`,
    [
      inventory.id,
      item.productId,
      item.variantId,
      branchId,
      previousQuantity,
      newQuantity,
      -item.quantity,
      `Sale ${saleId} completed`,
      requester?.id ?? null,
    ]
  );

  return mapAdjustmentRow(adjustmentResult.rows[0]);
}

async function restockInventoryItem(client, requester, saleId, branchId, item) {
  const inventoryResult = await client.query(
    `SELECT id,
            product_id,
            variant_id,
            branch_id,
            quantity
     FROM inventory
     WHERE product_id = $1
       AND branch_id = $2
       AND (
         ($3::bigint IS NULL AND variant_id IS NULL)
         OR variant_id = $3
       )
     FOR UPDATE`,
    [item.productId, branchId, item.variantId]
  );

  if (inventoryResult.rowCount === 0) {
    throw new HttpError(404, 'Inventory item not found.');
  }

  const inventory = inventoryResult.rows[0];
  const previousQuantity = Number(inventory.quantity);
  const newQuantity = previousQuantity + item.quantity;

  await client.query(
    `UPDATE inventory
     SET quantity = $2,
         last_updated = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [inventory.id, newQuantity]
  );

  const adjustmentResult = await client.query(
    `INSERT INTO inventory_adjustments (
       inventory_id,
       product_id,
       variant_id,
       branch_id,
       previous_quantity,
       new_quantity,
       quantity_change,
       reason,
       adjusted_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id,
               inventory_id,
               product_id,
               variant_id,
               branch_id,
               previous_quantity,
               new_quantity,
               quantity_change,
               reason,
               adjusted_by_user_id,
               created_at`,
    [
      inventory.id,
      item.productId,
      item.variantId,
      branchId,
      previousQuantity,
      newQuantity,
      item.quantity,
      `Sale ${saleId} refunded`,
      requester?.id ?? null,
    ]
  );

  return mapAdjustmentRow(adjustmentResult.rows[0]);
}

async function createCompletedSale(requester, payload) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const productTaxRates = await findProductTaxRates(client, payload.items);
    const normalized = normalizeSalePayload(payload, productTaxRates);

    const saleResult = await client.query(
      `INSERT INTO sales (
         customer_id,
         branch_id,
         status,
         subtotal,
         discount_amount,
         tax_amount,
         total_amount,
         paid_amount,
         balance_amount,
         payment_status,
         created_by
       )
       VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7, $8, 'paid', $9)
       RETURNING id,
                 customer_id,
                 branch_id,
                 status,
                 subtotal,
                 discount_amount,
                 tax_amount,
                 total_amount,
                 paid_amount,
                 balance_amount,
                 payment_status,
                 created_by,
                 created_at`,
      [
        normalized.customerId,
        normalized.branchId,
        normalized.subtotal,
        normalized.discountAmount,
        normalized.taxAmount,
        normalized.totalAmount,
        normalized.paidAmount,
        normalized.balanceAmount,
        requester?.id ?? null,
      ]
    );
    const saleId = saleResult.rows[0].id;
    const paymentValues = [];
    const paymentPlaceholders = normalized.payments.map((payment, index) => {
      const offset = index * 7;

      paymentValues.push(
        saleId,
        payment.amount,
        payment.method,
        payment.referenceNumber,
        payment.notes,
        payment.paidAt,
        requester?.id ?? null
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    });
    const paymentResult = await client.query(
      `INSERT INTO sale_payments (
         sale_id,
         amount,
         method,
         reference_number,
         notes,
         paid_at,
         created_by
       )
       VALUES ${paymentPlaceholders.join(', ')}
       RETURNING id,
                 sale_id,
                 amount,
                 method,
                 reference_number,
                 notes,
                 paid_at,
                 created_by,
                 created_at`,
      paymentValues
    );
    const itemValues = [];
    const itemPlaceholders = normalized.items.map((item, index) => {
      const offset = index * 7;

      itemValues.push(
        saleId,
        item.productId,
        item.variantId,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.lineTotal
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    });
    const itemResult = await client.query(
      `INSERT INTO sale_items (
         sale_id,
         product_id,
         variant_id,
         quantity,
         unit_price,
         discount_amount,
         line_total
       )
       VALUES ${itemPlaceholders.join(', ')}
       RETURNING id,
                 sale_id,
                 product_id,
                 variant_id,
                 quantity,
                 unit_price,
                 discount_amount,
                 line_total`,
      itemValues
    );
    const inventoryAdjustments = [];

    for (const item of normalized.items) {
      inventoryAdjustments.push(
        await deductInventoryItem(client, requester, saleId, normalized.branchId, item)
      );
    }

    const loyaltyPointsEarned = await awardLoyaltyPoints(
      client,
      normalized.customerId,
      normalized.totalAmount
    );

    await client.query('COMMIT');

    return {
      ...mapSaleRow(saleResult.rows[0], itemResult.rows.map(mapSaleItemRow)),
      payment: mapPaymentRow(paymentResult.rows[0]),
      payments: paymentResult.rows.map(mapPaymentRow),
      inventoryAdjustments,
      loyaltyPointsEarned,
    };
  } catch (error) {
    await client.query('ROLLBACK');

    throw mapForeignKeyError(error);
  } finally {
    client.release();
  }
}

async function suspendSale(requester, payload) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const productTaxRates = await findProductTaxRates(client, payload.items);
    const normalized = normalizeSaleDraftPayload(payload, productTaxRates);

    const saleResult = await client.query(
      `INSERT INTO sales (
         customer_id,
         branch_id,
         status,
         subtotal,
         discount_amount,
         tax_amount,
         total_amount,
         paid_amount,
         balance_amount,
         payment_status,
         created_by
       )
       VALUES ($1, $2, 'suspended', $3, $4, $5, $6, 0, $6, 'unpaid', $7)
       RETURNING id,
                 customer_id,
                 branch_id,
                 status,
                 subtotal,
                 discount_amount,
                 tax_amount,
                 total_amount,
                 paid_amount,
                 balance_amount,
                 payment_status,
                 created_by,
                 created_at`,
      [
        normalized.customerId,
        normalized.branchId,
        normalized.subtotal,
        normalized.discountAmount,
        normalized.taxAmount,
        normalized.totalAmount,
        requester?.id ?? null,
      ]
    );
    const saleId = saleResult.rows[0].id;
    const itemValues = [];
    const itemPlaceholders = normalized.items.map((item, index) => {
      const offset = index * 7;

      itemValues.push(
        saleId,
        item.productId,
        item.variantId,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.lineTotal
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    });
    const itemResult = await client.query(
      `INSERT INTO sale_items (
         sale_id,
         product_id,
         variant_id,
         quantity,
         unit_price,
         discount_amount,
         line_total
       )
       VALUES ${itemPlaceholders.join(', ')}
       RETURNING id,
                 sale_id,
                 product_id,
                 variant_id,
                 quantity,
                 unit_price,
                 discount_amount,
                 line_total`,
      itemValues
    );

    await client.query('COMMIT');

    return mapSaleRow(saleResult.rows[0], itemResult.rows.map(mapSaleItemRow));
  } catch (error) {
    await client.query('ROLLBACK');

    throw mapForeignKeyError(error);
  } finally {
    client.release();
  }
}

async function resumeSuspendedSale(_requester, payload) {
  const saleId = Number(payload.saleId ?? payload.sale_id);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const saleResult = await client.query(
      `SELECT id,
              customer_id,
              branch_id,
              status,
              subtotal,
              discount_amount,
              tax_amount,
              total_amount,
              paid_amount,
              balance_amount,
              payment_status,
              created_by,
              created_at
       FROM sales
       WHERE id = $1
       FOR UPDATE`,
      [saleId]
    );

    if (saleResult.rowCount === 0) {
      throw new HttpError(404, 'Suspended sale not found.');
    }

    if (saleResult.rows[0].status !== 'suspended') {
      throw new HttpError(400, 'Sale is not suspended.');
    }

    const resumedSaleResult = await client.query(
      `UPDATE sales
       SET status = 'resumed'
       WHERE id = $1
       RETURNING id,
                 customer_id,
                 branch_id,
                 status,
                 subtotal,
                 discount_amount,
                 tax_amount,
                 total_amount,
                 paid_amount,
                 balance_amount,
                 payment_status,
                 created_by,
                 created_at`,
      [saleId]
    );
    const itemResult = await client.query(
      `SELECT id,
              sale_id,
              product_id,
              variant_id,
              quantity,
              unit_price,
              discount_amount,
              line_total
       FROM sale_items
       WHERE sale_id = $1
       ORDER BY id ASC`,
      [saleId]
    );

    await client.query('COMMIT');

    return mapSaleRow(resumedSaleResult.rows[0], itemResult.rows.map(mapSaleItemRow));
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
}

async function processRefund(requester, payload) {
  const normalized = normalizeRefundPayload(payload);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const saleResult = await client.query(
      `SELECT id,
              customer_id,
              branch_id,
              status,
              subtotal,
              discount_amount,
              tax_amount,
              total_amount,
              paid_amount,
              balance_amount,
              payment_status,
              created_by,
              created_at
       FROM sales
       WHERE id = $1
       FOR UPDATE`,
      [normalized.saleId]
    );

    if (saleResult.rowCount === 0) {
      throw new HttpError(404, 'Sale not found.');
    }

    if (saleResult.rows[0].status === 'refunded') {
      throw new HttpError(400, 'Sale has already been fully refunded.');
    }

    const saleItemIds = normalized.items.map((item) => item.saleItemId);
    const saleItemResult = await client.query(
      `SELECT id,
              sale_id,
              product_id,
              variant_id,
              quantity,
              unit_price,
              discount_amount,
              line_total
       FROM sale_items
       WHERE sale_id = $1
         AND id = ANY($2::bigint[])
       FOR UPDATE`,
      [normalized.saleId, saleItemIds]
    );

    if (saleItemResult.rowCount !== saleItemIds.length) {
      throw new HttpError(400, 'Refund includes a sale item that does not belong to the sale.');
    }

    const refundedQuantityResult = await client.query(
      `SELECT sale_item_id,
              COALESCE(SUM(quantity), 0)::integer AS refunded_quantity
       FROM sale_refund_items
       WHERE sale_item_id = ANY($1::bigint[])
       GROUP BY sale_item_id`,
      [saleItemIds]
    );
    const refundedQuantityBySaleItemId = new Map(
      refundedQuantityResult.rows.map((row) => [
        String(row.sale_item_id),
        Number(row.refunded_quantity),
      ])
    );
    const saleItemsById = new Map(
      saleItemResult.rows.map((row) => [String(row.id), mapSaleItemRow(row)])
    );
    const refundItems = normalized.items.map((item) => {
      const saleItem = saleItemsById.get(String(item.saleItemId));
      const alreadyRefunded = refundedQuantityBySaleItemId.get(String(item.saleItemId)) ?? 0;
      const refundableQuantity = saleItem.quantity - alreadyRefunded;

      if (item.quantity > refundableQuantity) {
        throw new HttpError(400, 'Refund quantity exceeds the remaining sale item quantity.');
      }

      return {
        ...item,
        productId: Number(saleItem.productId),
        variantId: normalizeNullableInteger(saleItem.variantId),
        amount: roundCurrency((saleItem.lineTotal * item.quantity) / saleItem.quantity),
      };
    });
    const refundAmount = roundCurrency(
      refundItems.reduce((sum, item) => sum + item.amount, 0)
    );

    const refundResult = await client.query(
      `INSERT INTO sale_refunds (
         sale_id,
         amount,
         reason,
         method,
         reference_number,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 sale_id,
                 amount,
                 reason,
                 method,
                 reference_number,
                 notes,
                 created_by,
                 created_at`,
      [
        normalized.saleId,
        refundAmount,
        normalized.reason,
        normalized.method,
        normalized.referenceNumber,
        normalized.notes,
        requester?.id ?? null,
      ]
    );
    const refundId = refundResult.rows[0].id;
    const refundItemValues = [];
    const refundItemPlaceholders = refundItems.map((item, index) => {
      const offset = index * 4;

      refundItemValues.push(refundId, item.saleItemId, item.quantity, item.amount);

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    });
    const refundItemResult = await client.query(
      `INSERT INTO sale_refund_items (
         refund_id,
         sale_item_id,
         quantity,
         amount
       )
       VALUES ${refundItemPlaceholders.join(', ')}
       RETURNING id,
                 refund_id,
                 sale_item_id,
                 quantity,
                 amount`,
      refundItemValues
    );
    const inventoryAdjustments = [];

    for (const item of refundItems) {
      inventoryAdjustments.push(
        await restockInventoryItem(
          client,
          requester,
          normalized.saleId,
          Number(saleResult.rows[0].branch_id),
          item
        )
      );
    }

    const refundStatusResult = await client.query(
      `SELECT COALESCE(SUM(sale_items.quantity), 0)::integer AS sold_quantity,
              COALESCE(SUM(refunded_items.refunded_quantity), 0)::integer AS refunded_quantity
       FROM sale_items
       LEFT JOIN (
         SELECT sale_item_id,
                SUM(quantity) AS refunded_quantity
         FROM sale_refund_items
         GROUP BY sale_item_id
       ) refunded_items
         ON refunded_items.sale_item_id = sale_items.id
       WHERE sale_items.sale_id = $1`,
      [normalized.saleId]
    );
    const soldQuantity = Number(refundStatusResult.rows[0].sold_quantity);
    const refundedQuantity = Number(refundStatusResult.rows[0].refunded_quantity);
    const status = refundedQuantity >= soldQuantity ? 'refunded' : 'partially_refunded';

    await client.query(
      `UPDATE sales
       SET status = $2,
           payment_status = $3
       WHERE id = $1`,
      [normalized.saleId, status, status]
    );

    await client.query('COMMIT');

    const mappedRefundItems = refundItemResult.rows.map(mapRefundItemRow);

    return {
      ...mapRefundRow(refundResult.rows[0], mappedRefundItems),
      saleStatus: status,
      inventoryAdjustments,
    };
  } catch (error) {
    await client.query('ROLLBACK');

    throw mapForeignKeyError(error);
  } finally {
    client.release();
  }
}

async function findAll(filters = {}) {
  const normalizedFilters = normalizeSaleFilters(filters);
  const params = [];
  const where = [];

  if (normalizedFilters.dateFrom !== undefined) {
    params.push(normalizedFilters.dateFrom);
    where.push(`created_at >= $${params.length}`);
  }

  if (normalizedFilters.dateTo !== undefined) {
    params.push(normalizedFilters.dateTo);
    where.push(`created_at <= $${params.length}`);
  }

  if (normalizedFilters.cashierId !== undefined) {
    params.push(Number(normalizedFilters.cashierId));
    where.push(`created_by = $${params.length}`);
  }

  if (normalizedFilters.branchId !== undefined) {
    params.push(Number(normalizedFilters.branchId));
    where.push(`branch_id = $${params.length}`);
  }

  if (normalizedFilters.status !== undefined) {
    params.push(normalizedFilters.status.trim());
    where.push(`status = $${params.length}`);
  }

  const result = await database.query(
    `SELECT id,
            customer_id,
            branch_id,
            status,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            paid_amount,
            balance_amount,
            payment_status,
            created_by,
            created_at
     FROM sales
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  return result.rows.map((row) => mapSaleRow(row));
}

async function findById(saleId) {
  const saleResult = await database.query(
    `SELECT id,
            customer_id,
            branch_id,
            status,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            paid_amount,
            balance_amount,
            payment_status,
            created_by,
            created_at
     FROM sales
     WHERE id = $1`,
    [saleId]
  );

  if (saleResult.rowCount === 0) {
    throw new HttpError(404, 'Sale not found.');
  }

  const itemResult = await database.query(
    `SELECT id,
            sale_id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            discount_amount,
            line_total
     FROM sale_items
     WHERE sale_id = $1
     ORDER BY id ASC`,
    [saleId]
  );
  const paymentResult = await database.query(
    `SELECT id,
            sale_id,
            amount,
            method,
            reference_number,
            notes,
            paid_at,
            created_by,
            created_at
     FROM sale_payments
     WHERE sale_id = $1
     ORDER BY paid_at ASC, id ASC`,
    [saleId]
  );

  return {
    ...mapSaleRow(saleResult.rows[0], itemResult.rows.map(mapSaleItemRow)),
    payments: paymentResult.rows.map(mapPaymentRow),
  };
}

async function sendReceiptSms(saleId) {
  const saleResult = await database.query(
    `SELECT s.id,
            s.customer_id,
            s.branch_id,
            s.status,
            s.subtotal,
            s.discount_amount,
            s.tax_amount,
            s.total_amount,
            s.paid_amount,
            s.balance_amount,
            s.payment_status,
            s.created_by,
            s.created_at,
            c.phone AS customer_phone,
            b.currency
     FROM sales s
     LEFT JOIN customers c
       ON c.id = s.customer_id
     INNER JOIN branches b
       ON b.id = s.branch_id
     WHERE s.id = $1`,
    [saleId]
  );

  if (saleResult.rowCount === 0) {
    throw new HttpError(404, 'Sale not found.');
  }

  const sale = mapSaleRow(saleResult.rows[0]);
  const phone = normalizeNullableString(saleResult.rows[0].customer_phone);

  if (sale.customerId === null || sale.customerId === undefined) {
    throw new HttpError(400, 'Sale is not linked to a customer.');
  }

  if (!phone) {
    throw new HttpError(400, 'Customer phone number is required to send an SMS receipt.');
  }

  const itemResult = await database.query(
    `SELECT si.id,
            si.sale_id,
            si.product_id,
            si.variant_id,
            si.quantity,
            si.unit_price,
            si.discount_amount,
            si.line_total,
            COALESCE(pv.name, p.name) AS item_name
     FROM sale_items si
     INNER JOIN products p
       ON p.id = si.product_id
     LEFT JOIN product_variants pv
       ON pv.id = si.variant_id
     WHERE si.sale_id = $1
     ORDER BY si.id ASC`,
    [saleId]
  );
  const items = itemResult.rows.map((row) => ({
    ...mapSaleItemRow(row),
    name: row.item_name,
  }));
  const message = buildReceiptSmsMessage({
    sale,
    items,
    currency: saleResult.rows[0].currency,
  });
  const delivery = await smsService.sendSms({
    to: phone,
    message,
  });

  return {
    saleId: sale.id,
    customerId: sale.customerId,
    to: phone,
    message,
    deliveryStatus: delivery.status,
  };
}

module.exports = {
  buildReceiptSmsMessage,
  calculateLoyaltyPointsEarned,
  createCompletedSale,
  findProductTaxRates,
  findAll,
  findById,
  mapRefundItemRow,
  mapRefundRow,
  mapPaymentRow,
  mapSaleItemRow,
  mapSaleRow,
  normalizeRefundPayload,
  normalizeSaleFilters,
  normalizeSaleDraftPayload,
  normalizeSalePayload,
  processRefund,
  resumeSuspendedSale,
  sendReceiptSms,
  suspendSale,
};
