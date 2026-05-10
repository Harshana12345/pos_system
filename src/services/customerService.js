const database = require('../config/database');
const Customer = require('../models/Customer');
const HttpError = require('../utils/httpError');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value);
}

function normalizeNonNegativeInteger(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function normalizeBalance(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function mapCustomerRow(row) {
  return new Customer({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    loyaltyPoints: Number(row.loyalty_points),
    creditBalance: Number(row.credit_balance),
    notes: row.notes,
    status: row.status,
    customerGroupId: row.customer_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mapSaleItemRow(row) {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unit_price);
  const discountAmount = Number(row.discount_amount ?? 0);
  const lineTotal =
    row.line_total === undefined || row.line_total === null
      ? roundCurrency(quantity * unitPrice - discountAmount)
      : Number(row.line_total);

  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    variantId: row.variant_id,
    quantity,
    unitPrice,
    discountAmount,
    lineTotal,
  };
}

function mapSaleRow(row, items = []) {
  return {
    id: row.id,
    customerId: row.customer_id,
    branchId: row.branch_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount ?? 0),
    balanceAmount: Number(row.balance_amount ?? 0),
    paymentStatus: row.payment_status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items,
  };
}

const CUSTOMER_COLUMNS = `id,
                          full_name,
                          phone,
                          email,
                          address,
                          loyalty_points,
                          credit_balance,
                          notes,
                          status,
                          customer_group_id,
                          created_at,
                          updated_at`;

async function findAll() {
  const result = await database.query(
    `SELECT ${CUSTOMER_COLUMNS}
     FROM customers
     ORDER BY id ASC`
  );

  return result.rows.map(mapCustomerRow);
}

async function findById(id) {
  const result = await database.query(
    `SELECT ${CUSTOMER_COLUMNS}
     FROM customers
     WHERE id = $1`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }

  return mapCustomerRow(result.rows[0]);
}

async function findPurchaseHistoryById(id) {
  const customerId = Number(id);
  const customerResult = await database.query(
    `SELECT id
     FROM customers
     WHERE id = $1`,
    [customerId]
  );

  if (customerResult.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }

  const result = await database.query(
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
            si.id AS item_id,
            si.sale_id,
            si.product_id,
            si.variant_id,
            si.quantity,
            si.unit_price,
            si.discount_amount AS item_discount_amount,
            si.line_total
     FROM sales s
     LEFT JOIN sale_items si
       ON si.sale_id = s.id
     WHERE s.customer_id = $1
     ORDER BY s.created_at DESC, s.id DESC, si.id ASC`,
    [customerId]
  );

  const salesById = new Map();

  for (const row of result.rows) {
    if (!salesById.has(row.id)) {
      salesById.set(row.id, {
        row,
        items: [],
      });
    }

    if (row.item_id !== null && row.item_id !== undefined) {
      salesById.get(row.id).items.push(
        mapSaleItemRow({
          id: row.item_id,
          sale_id: row.sale_id,
          product_id: row.product_id,
          variant_id: row.variant_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          discount_amount: row.item_discount_amount,
          line_total: row.line_total,
        })
      );
    }
  }

  return Array.from(salesById.values()).map(({ row, items }) =>
    mapSaleRow(row, items)
  );
}

async function createCustomer({
  fullName,
  full_name,
  phone,
  email,
  address,
  loyaltyPoints,
  loyalty_points,
  creditBalance,
  credit_balance,
  notes,
  status,
  customerGroupId,
  customer_group_id,
}) {
  try {
    const result = await database.query(
      `INSERT INTO customers (
         full_name,
         phone,
         email,
         address,
         loyalty_points,
         credit_balance,
         notes,
         status,
         customer_group_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${CUSTOMER_COLUMNS}`,
      [
        (fullName ?? full_name).trim(),
        normalizeNullableString(phone),
        normalizeNullableString(email),
        normalizeNullableString(address),
        normalizeNonNegativeInteger(loyaltyPoints ?? loyalty_points),
        normalizeBalance(creditBalance ?? credit_balance),
        normalizeNullableString(notes),
        status || 'active',
        normalizeNullableInteger(customerGroupId ?? customer_group_id),
      ]
    );

    return mapCustomerRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(400, 'Customer group reference is invalid.');
    }

    throw error;
  }
}

async function updateCustomer(
  id,
  {
    fullName,
    full_name,
    phone,
    email,
    address,
    loyaltyPoints,
    loyalty_points,
    creditBalance,
    credit_balance,
    notes,
    status,
    customerGroupId,
    customer_group_id,
  }
) {
  try {
    const result = await database.query(
      `UPDATE customers
       SET full_name = $2,
           phone = $3,
           email = $4,
           address = $5,
           loyalty_points = $6,
           credit_balance = $7,
           notes = $8,
           status = $9,
           customer_group_id = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${CUSTOMER_COLUMNS}`,
      [
        Number(id),
        (fullName ?? full_name).trim(),
        normalizeNullableString(phone),
        normalizeNullableString(email),
        normalizeNullableString(address),
        normalizeNonNegativeInteger(loyaltyPoints ?? loyalty_points),
        normalizeBalance(creditBalance ?? credit_balance),
        normalizeNullableString(notes),
        status || 'active',
        normalizeNullableInteger(customerGroupId ?? customer_group_id),
      ]
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Customer not found.');
    }

    return mapCustomerRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(400, 'Customer group reference is invalid.');
    }

    throw error;
  }
}

async function deleteCustomer(id) {
  const result = await database.query(
    `DELETE FROM customers
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }
}

module.exports = {
  createCustomer,
  deleteCustomer,
  findAll,
  findById,
  findPurchaseHistoryById,
  mapCustomerRow,
  mapSaleItemRow,
  mapSaleRow,
  updateCustomer,
};
