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

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');

  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signInput(input, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(input)
    .digest('base64')
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
  const signature = signInput(signingInput, secret);

  return {
    token: `${signingInput}.${signature}`,
    expiresIn: expiresInSeconds,
  };
}

function verifyJwt(token, { secret, now = Math.floor(Date.now() / 1000) }) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('JWT secret is required.');
  }

  if (typeof token !== 'string') {
    throw new Error('JWT token must be a string.');
  }

  const parts = token.split('.');

  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error('JWT token is malformed.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signInput(signingInput, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('JWT signature is invalid.');
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader));

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('JWT header is invalid.');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new Error('JWT token has expired.');
  }

  return payload;
}

module.exports = { parseExpiresIn, signJwt, verifyJwt };
