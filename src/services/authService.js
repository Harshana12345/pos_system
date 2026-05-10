const database = require('../config/database');
const { env } = require('../config/env');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { signJwt } = require('../utils/jwt');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');

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

async function loginUser({ email, password }) {
  const result = await database.query(
    `SELECT id, name, email, password, role_id, branch_id, status, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  const row = result.rows[0];

  if (!row || !(await verifyPassword(password, row.password))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  if (row.status !== 'active') {
    throw new HttpError(403, 'User account is inactive.');
  }

  const user = mapUserRow(row);
  const { token, expiresIn } = signJwt(
    {
      sub: String(user.id),
      email: user.email,
      roleId: user.roleId,
      branchId: user.branchId,
    },
    {
      secret: env.jwt.accessSecret,
      expiresIn: env.jwt.accessExpiresIn,
    }
  );

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn,
    user,
  };
}

module.exports = { loginUser, registerUser };
