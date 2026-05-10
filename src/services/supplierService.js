const database = require('../config/database');
const Supplier = require('../models/Supplier');
const HttpError = require('../utils/httpError');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeBalance(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function mapSupplierRow(row) {
  return new Supplier({
    id: row.id,
    name: row.name,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    taxId: row.tax_id,
    notes: row.notes,
    balance: Number(row.balance),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function findAll() {
  const result = await database.query(
    `SELECT id,
            name,
            contact_number,
            email,
            address,
            tax_id,
            notes,
            balance,
            status,
            created_at,
            updated_at
     FROM suppliers
     ORDER BY id ASC`
  );

  return result.rows.map(mapSupplierRow);
}

async function createSupplier({
  name,
  contactNumber,
  contact_number,
  email,
  address,
  taxId,
  tax_id,
  notes,
  balance,
  status,
}) {
  const result = await database.query(
    `INSERT INTO suppliers (
       name,
       contact_number,
       email,
       address,
       tax_id,
       notes,
       balance,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id,
               name,
               contact_number,
               email,
               address,
               tax_id,
               notes,
               balance,
               status,
               created_at,
               updated_at`,
    [
      name.trim(),
      normalizeNullableString(contactNumber ?? contact_number),
      normalizeNullableString(email),
      normalizeNullableString(address),
      normalizeNullableString(taxId ?? tax_id),
      normalizeNullableString(notes),
      normalizeBalance(balance),
      status || 'active',
    ]
  );

  return mapSupplierRow(result.rows[0]);
}

async function updateSupplier(
  id,
  {
    name,
    contactNumber,
    contact_number,
    email,
    address,
    taxId,
    tax_id,
    notes,
    balance,
    status,
  }
) {
  const result = await database.query(
    `UPDATE suppliers
     SET name = $2,
         contact_number = $3,
         email = $4,
         address = $5,
         tax_id = $6,
         notes = $7,
         balance = $8,
         status = $9,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id,
               name,
               contact_number,
               email,
               address,
               tax_id,
               notes,
               balance,
               status,
               created_at,
               updated_at`,
    [
      Number(id),
      name.trim(),
      normalizeNullableString(contactNumber ?? contact_number),
      normalizeNullableString(email),
      normalizeNullableString(address),
      normalizeNullableString(taxId ?? tax_id),
      normalizeNullableString(notes),
      normalizeBalance(balance),
      status || 'active',
    ]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Supplier not found.');
  }

  return mapSupplierRow(result.rows[0]);
}

async function deleteSupplier(id) {
  const result = await database.query(
    `DELETE FROM suppliers
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Supplier not found.');
  }
}

module.exports = {
  createSupplier,
  deleteSupplier,
  findAll,
  mapSupplierRow,
  updateSupplier,
};
