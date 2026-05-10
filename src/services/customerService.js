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
  mapCustomerRow,
  updateCustomer,
};
