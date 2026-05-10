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

function normalizeNullableDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function formatDateOnly(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
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
    dateOfBirth: formatDateOnly(row.date_of_birth),
    notes: row.notes,
    status: row.status,
    customerGroupId: row.customer_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapCreditBalanceRow(row) {
  return {
    customerId: row.id,
    creditBalance: Number(row.credit_balance),
  };
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
                          date_of_birth,
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

async function findCreditBalanceById(id) {
  const result = await database.query(
    `SELECT id,
            credit_balance
     FROM customers
     WHERE id = $1`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }

  return mapCreditBalanceRow(result.rows[0]);
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

function parseDateOnly(value) {
  const [year, month, day] = formatDateOnly(value).split('-').map(Number);

  return { year, month, day };
}

function makeDateOnly(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCMonth() !== month - 1) {
    return new Date(Date.UTC(year, 1, 28));
  }

  return date;
}

function diffInDays(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (endDate.getTime() - startDate.getTime()) / millisecondsPerDay
  );
}

function calculateNextBirthday(dateOfBirth, referenceDate = new Date()) {
  const { month, day } = parseDateOnly(dateOfBirth);
  const reference = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const referenceYear = reference.getUTCFullYear();
  let nextBirthday = makeDateOnly(referenceYear, month, day);

  if (nextBirthday < reference) {
    nextBirthday = makeDateOnly(referenceYear + 1, month, day);
  }

  return {
    daysUntilBirthday: diffInDays(reference, nextBirthday),
    nextBirthdayDate: nextBirthday.toISOString().slice(0, 10),
  };
}

function mapBirthdayPromotionCustomer(customer, birthday) {
  return {
    ...customer,
    notifyBirthdayPromotion: true,
    daysUntilBirthday: birthday.daysUntilBirthday,
    nextBirthdayDate: birthday.nextBirthdayDate,
  };
}

async function findUpcomingBirthdayPromotions({
  daysAhead = 14,
  referenceDate = new Date(),
} = {}) {
  const result = await database.query(
    `SELECT ${CUSTOMER_COLUMNS}
     FROM customers
     WHERE status = $1
       AND date_of_birth IS NOT NULL
     ORDER BY id ASC`,
    ['active']
  );

  return result.rows
    .map(mapCustomerRow)
    .map((customer) => ({
      customer,
      birthday: calculateNextBirthday(customer.dateOfBirth, referenceDate),
    }))
    .filter(({ birthday }) => birthday.daysUntilBirthday <= Number(daysAhead))
    .map(({ customer, birthday }) =>
      mapBirthdayPromotionCustomer(customer, birthday)
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
  dateOfBirth,
  date_of_birth,
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
         date_of_birth,
         notes,
         status,
         customer_group_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${CUSTOMER_COLUMNS}`,
      [
        (fullName ?? full_name).trim(),
        normalizeNullableString(phone),
        normalizeNullableString(email),
        normalizeNullableString(address),
        normalizeNonNegativeInteger(loyaltyPoints ?? loyalty_points),
        normalizeBalance(creditBalance ?? credit_balance),
        normalizeNullableDate(dateOfBirth ?? date_of_birth),
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
    dateOfBirth,
    date_of_birth,
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
           date_of_birth = $8,
           notes = $9,
           status = $10,
           customer_group_id = $11,
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
        normalizeNullableDate(dateOfBirth ?? date_of_birth),
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

async function adjustLoyaltyPoints(id, { action, points }) {
  if (!['add', 'redeem'].includes(action)) {
    throw new HttpError(400, 'Loyalty points action must be add or redeem.');
  }

  const customerId = Number(id);
  const pointAmount = Number(points);

  if (!Number.isInteger(pointAmount) || pointAmount <= 0) {
    throw new HttpError(400, 'Loyalty points must be a positive integer.');
  }

  const operator = action === 'add' ? '+' : '-';
  const condition = action === 'redeem' ? 'AND loyalty_points >= $2' : '';

  const result = await database.query(
    `UPDATE customers
     SET loyalty_points = loyalty_points ${operator} $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       ${condition}
     RETURNING ${CUSTOMER_COLUMNS}`,
    [customerId, pointAmount]
  );

  if (result.rowCount > 0) {
    return mapCustomerRow(result.rows[0]);
  }

  const customerResult = await database.query(
    `SELECT id
     FROM customers
     WHERE id = $1`,
    [customerId]
  );

  if (customerResult.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }

  throw new HttpError(400, 'Insufficient loyalty points.');
}

async function adjustCreditBalance(id, { action, amount }) {
  if (!['add', 'subtract'].includes(action)) {
    throw new HttpError(400, 'Credit balance action must be add or subtract.');
  }

  const customerId = Number(id);
  const adjustmentAmount = Number(amount);

  if (!Number.isFinite(adjustmentAmount) || adjustmentAmount <= 0) {
    throw new HttpError(400, 'Credit balance amount must be a positive number.');
  }

  const operator = action === 'add' ? '+' : '-';
  const condition = action === 'subtract' ? 'AND credit_balance >= $2' : '';

  const result = await database.query(
    `UPDATE customers
     SET credit_balance = credit_balance ${operator} $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       ${condition}
     RETURNING id,
               credit_balance`,
    [customerId, adjustmentAmount]
  );

  if (result.rowCount > 0) {
    return mapCreditBalanceRow(result.rows[0]);
  }

  const customerResult = await database.query(
    `SELECT id
     FROM customers
     WHERE id = $1`,
    [customerId]
  );

  if (customerResult.rowCount === 0) {
    throw new HttpError(404, 'Customer not found.');
  }

  throw new HttpError(400, 'Insufficient credit balance.');
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
  adjustCreditBalance,
  adjustLoyaltyPoints,
  calculateNextBirthday,
  createCustomer,
  deleteCustomer,
  findAll,
  findCreditBalanceById,
  findById,
  findUpcomingBirthdayPromotions,
  findPurchaseHistoryById,
  mapCreditBalanceRow,
  mapCustomerRow,
  mapSaleItemRow,
  mapSaleRow,
  updateCustomer,
};
