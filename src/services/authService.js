const database = require('../config/database');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/passwordHash');

function mapUserRow(row) {
  return new User({
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role_id,
    branchId: row.branch_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function registerUser({ name, email, password, roleId, branchId }) {
  const passwordHash = await hashPassword(password);

  try {
    const result = await database.query(
      `INSERT INTO users (name, email, password, role_id, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role_id, branch_id, status, created_at, updated_at`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, Number(roleId), Number(branchId)]
    );

    return mapUserRow(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'A user with this email already exists.');
    }

    throw error;
  }
}

module.exports = { registerUser };
