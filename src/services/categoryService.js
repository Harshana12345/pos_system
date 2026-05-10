const database = require('../config/database');
const Category = require('../models/Category');
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

function mapCategoryRow(row) {
  return new Category({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
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
            parent_id,
            description,
            status,
            created_at,
            updated_at
     FROM categories
     ORDER BY id ASC`
  );

  return result.rows.map(mapCategoryRow);
}

async function createCategory({ name, parentId, parent_id, description, status }) {
  try {
    const result = await database.query(
      `INSERT INTO categories (name, parent_id, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_id, description, status, created_at, updated_at`,
      [
        name.trim(),
        normalizeNullableInteger(parentId ?? parent_id),
        normalizeNullableString(description),
        status || 'active',
      ]
    );

    return mapCategoryRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(400, 'Category parent reference is invalid.');
    }

    throw error;
  }
}

async function updateCategory(
  id,
  { name, parentId, parent_id, description, status }
) {
  const normalizedParentId = normalizeNullableInteger(parentId ?? parent_id);

  if (normalizedParentId === Number(id)) {
    throw new HttpError(400, 'Category cannot be its own parent.');
  }

  try {
    const result = await database.query(
      `UPDATE categories
       SET name = $2,
           parent_id = $3,
           description = $4,
           status = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, parent_id, description, status, created_at, updated_at`,
      [
        Number(id),
        name.trim(),
        normalizedParentId,
        normalizeNullableString(description),
        status || 'active',
      ]
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Category not found.');
    }

    return mapCategoryRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(400, 'Category parent reference is invalid.');
    }

    throw error;
  }
}

async function deleteCategory(id) {
  const result = await database.query(
    `DELETE FROM categories
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Category not found.');
  }
}

module.exports = {
  createCategory,
  deleteCategory,
  findAll,
  mapCategoryRow,
  updateCategory,
};
