const crypto = require('crypto');

const database = require('../config/database');
const { env } = require('../config/env');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { signJwt, verifyJwt } = require('../utils/jwt');
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

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken({ userId, token, expiresIn }) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await database.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt]
  );

  return expiresAt;
}

function createAccessToken(user) {
  return signJwt(
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
  const { token, expiresIn } = createAccessToken(user);
  const { token: refreshToken, expiresIn: refreshExpiresIn } = signJwt(
    {
      sub: String(user.id),
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );
  const refreshTokenExpiresAt = await storeRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresIn: refreshExpiresIn,
  });

  return {
    accessToken: token,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn,
    refreshExpiresIn,
    refreshTokenExpiresAt,
    user,
  };
}

async function refreshAccessToken(refreshToken) {
  let payload;

  try {
    payload = verifyJwt(refreshToken, { secret: env.jwt.refreshSecret });
  } catch {
    throw new HttpError(401, 'Invalid refresh token.');
  }

  if (
    payload.type !== 'refresh' ||
    !Number.isInteger(Number(payload.sub)) ||
    Number(payload.sub) <= 0
  ) {
    throw new HttpError(401, 'Invalid refresh token.');
  }

  const tokenHash = hashToken(refreshToken);
  const result = await database.query(
    `SELECT u.id, u.name, u.email, u.role_id, u.branch_id, u.status, u.created_at, u.updated_at
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
       AND rt.user_id = $2
       AND rt.revoked_at IS NULL
       AND rt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash, payload.sub]
  );
  const row = result.rows[0];

  if (!row) {
    throw new HttpError(401, 'Invalid refresh token.');
  }

  if (row.status !== 'active') {
    throw new HttpError(403, 'User account is inactive.');
  }

  const user = mapUserRow(row);
  const { token, expiresIn } = createAccessToken(user);

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn,
    user,
  };
}

module.exports = { loginUser, refreshAccessToken, registerUser };
