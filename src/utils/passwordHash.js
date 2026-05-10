const bcrypt = require('bcrypt');

const DEFAULT_SALT_ROUNDS = 12;

function assertPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('Password must be a non-empty string');
  }
}

async function hashPassword(password, saltRounds = DEFAULT_SALT_ROUNDS) {
  assertPassword(password);

  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, passwordHash) {
  assertPassword(password);

  if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
    throw new TypeError('Password hash must be a non-empty string');
  }

  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  DEFAULT_SALT_ROUNDS,
  hashPassword,
  verifyPassword,
};
