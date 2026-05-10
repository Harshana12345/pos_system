const database = require('../config/database');
const Brand = require('../models/Brand');
const HttpError = require('../utils/httpError');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function mapBrandRow(row) {
  return new Brand({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function findAll() {
  const result = await database.query(
    `SELECT id,
            name,
            description,
            status,
            created_at,
            updated_at
     FROM brands
     ORDER BY id ASC`
  );

  return result.rows.map(mapBrandRow);
}

async function createBrand({ name, description, status }) {
  const result = await database.query(
    `INSERT INTO brands (name, description, status)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, status, created_at, updated_at`,
    [
      name.trim(),
      normalizeNullableString(description),
      status || 'active',
    ]
  );

  return mapBrandRow(result.rows[0]);
}

async function updateBrand(id, { name, description, status }) {
  const result = await database.query(
    `UPDATE brands
     SET name = $2,
         description = $3,
         status = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, description, status, created_at, updated_at`,
    [
      Number(id),
      name.trim(),
      normalizeNullableString(description),
      status || 'active',
    ]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Brand not found.');
  }

  return mapBrandRow(result.rows[0]);
}

async function deleteBrand(id) {
  const result = await database.query(
    `DELETE FROM brands
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Brand not found.');
  }
}

module.exports = {
  createBrand,
  deleteBrand,
  findAll,
  mapBrandRow,
  updateBrand,
};
