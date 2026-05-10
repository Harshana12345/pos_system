const crypto = require('crypto');

const TIME_UNITS_IN_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseExpiresIn(expiresIn) {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Math.floor(expiresIn);
  }

  const match = String(expiresIn).trim().match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('JWT expiration must be a positive number of seconds or use s, m, h, or d.');
  }

  return Number(match[1]) * TIME_UNITS_IN_SECONDS[match[2]];
}

function signJwt(payload, { secret, expiresIn }) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('JWT secret is required.');
  }

  const expiresInSeconds = parseExpiresIn(expiresIn);
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return {
    token: `${signingInput}.${signature}`,
    expiresIn: expiresInSeconds,
  };
}

module.exports = { parseExpiresIn, signJwt };
