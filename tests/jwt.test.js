const assert = require('node:assert');
const crypto = require('node:crypto');
const test = require('node:test');

const { parseExpiresIn, signJwt, verifyJwt } = require('../src/utils/jwt');

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

test('parseExpiresIn supports seconds and shorthand units', () => {
  assert.equal(parseExpiresIn(60), 60);
  assert.equal(parseExpiresIn('15m'), 900);
  assert.equal(parseExpiresIn('2h'), 7200);
  assert.equal(parseExpiresIn('7d'), 604800);
});

test('signJwt creates a verifiable HS256 token with expiration claims', () => {
  const { token, expiresIn } = signJwt(
    {
      sub: '1',
      email: 'admin@example.com',
    },
    {
      secret: 'test-secret',
      expiresIn: '15m',
    }
  );
  const [header, payload, signature] = token.split('.');
  const decodedHeader = JSON.parse(base64UrlDecode(header));
  const decodedPayload = JSON.parse(base64UrlDecode(payload));

  assert.equal(expiresIn, 900);
  assert.deepEqual(decodedHeader, {
    alg: 'HS256',
    typ: 'JWT',
  });
  assert.equal(decodedPayload.sub, '1');
  assert.equal(decodedPayload.email, 'admin@example.com');
  assert.equal(decodedPayload.exp - decodedPayload.iat, 900);
  assert.equal(signature, signInput(`${header}.${payload}`, 'test-secret'));
});

test('verifyJwt validates signature and expiration', () => {
  const { token } = signJwt(
    {
      sub: '1',
      type: 'refresh',
    },
    {
      secret: 'test-secret',
      expiresIn: '15m',
    }
  );
  const payload = verifyJwt(token, { secret: 'test-secret' });

  assert.equal(payload.sub, '1');
  assert.equal(payload.type, 'refresh');
  assert.throws(() => verifyJwt(token, { secret: 'wrong-secret' }), {
    message: 'JWT signature is invalid.',
  });
  assert.throws(() => verifyJwt(token, { secret: 'test-secret', now: payload.exp }), {
    message: 'JWT token has expired.',
  });
});
