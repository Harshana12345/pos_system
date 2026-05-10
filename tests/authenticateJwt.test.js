const assert = require('node:assert');
const test = require('node:test');

const { authenticateJwt, extractBearerToken } = require('../src/middleware/authenticateJwt');
const { env } = require('../src/config/env');
const { signJwt } = require('../src/utils/jwt');

function createRequest(authorization) {
  return {
    get(headerName) {
      if (headerName.toLowerCase() === 'authorization') {
        return authorization;
      }

      return undefined;
    },
  };
}

function runMiddleware(req) {
  return new Promise((resolve) => {
    authenticateJwt(req, {}, (error) => {
      resolve(error);
    });
  });
}

test('extractBearerToken returns the token from a valid Authorization header', () => {
  assert.equal(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('Bearer    abc.def.ghi'), 'abc.def.ghi');
});

test('extractBearerToken rejects missing or malformed Authorization headers', () => {
  assert.equal(extractBearerToken(undefined), null);
  assert.equal(extractBearerToken('Basic abc.def.ghi'), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken('Bearer abc.def.ghi extra'), null);
});

test('authenticateJwt attaches the authenticated access token user to the request', async () => {
  const { token } = signJwt(
    {
      sub: '42',
      email: 'cashier@example.com',
      roleId: 3,
      branchId: 2,
    },
    {
      secret: env.jwt.accessSecret,
      expiresIn: '15m',
    }
  );
  const req = createRequest(`Bearer ${token}`);
  const error = await runMiddleware(req);

  assert.equal(error, undefined);
  assert.deepEqual(req.user, {
    id: 42,
    email: 'cashier@example.com',
    roleId: 3,
    branchId: 2,
  });
  assert.equal(req.auth.token, token);
  assert.equal(req.auth.payload.sub, '42');
});

test('authenticateJwt rejects requests without a bearer token', async () => {
  const error = await runMiddleware(createRequest(undefined));

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, 'Bearer token is required.');
});

test('authenticateJwt rejects invalid access tokens', async () => {
  const error = await runMiddleware(createRequest('Bearer not-a-token'));

  assert.equal(error.statusCode, 401);
  assert.equal(error.message, 'Invalid access token.');
});
