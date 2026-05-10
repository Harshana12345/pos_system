const database = require('../config/database');
const Branch = require('../models/Branch');
const HttpError = require('../utils/httpError');

function mapBranchRow(row) {
  return new Branch({
    id: row.id,
    name: row.name,
    address: row.address,
    contact: row.contact,
    taxInfo: row.tax_info,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

async function updateBranch(id, { name, address, contact, taxInfo, tax_info, currency, status }) {
  const result = await database.query(
    `UPDATE branches
     SET name = $2,
         address = $3,
         contact = $4,
         tax_info = $5,
         currency = $6,
         status = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, address, contact, tax_info, currency, status, created_at, updated_at`,
    [
      Number(id),
      name.trim(),
      normalizeNullableString(address),
      normalizeNullableString(contact),
      normalizeNullableString(taxInfo ?? tax_info),
      String(currency || 'USD').trim(),
      status || 'active',
    ]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Branch not found.');
  }

  return mapBranchRow(result.rows[0]);
}

module.exports = { mapBranchRow, updateBranch };
