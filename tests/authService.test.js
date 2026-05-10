const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('bcrypt');
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');

  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

test('registerUser hashes password and returns user without password', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { verifyPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;
  let queryParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (_sql, params) => {
    queryParams = params;

    return {
      rows: [
        {
          id: '1',
          name: params[0],
          email: params[1],
          role_id: params[3],
          branch_id: params[4],
          status: 'active',
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  const user = await authService.registerUser({
    name: ' Admin User ',
    email: 'ADMIN@EXAMPLE.COM ',
    password: 'password123',
    roleId: '1',
    branchId: '2',
  });

  assert.equal(queryParams[0], 'Admin User');
  assert.equal(queryParams[1], 'admin@example.com');
  assert.notEqual(queryParams[2], 'password123');
  assert.equal(await verifyPassword('password123', queryParams[2]), true);
  assert.equal(queryParams[3], 1);
  assert.equal(queryParams[4], 2);
  assert.equal(user.email, 'admin@example.com');
  assert.equal(user.password, undefined);
});

test('loginUser validates credentials and returns a signed access token', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;
  let queryParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (_sql, params) => {
    queryParams = params;

    return {
      rows: [
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          password: await hashPassword('password123'),
          role_id: '1',
          branch_id: '2',
          status: 'active',
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  const session = await authService.loginUser({
    email: 'ADMIN@EXAMPLE.COM ',
    password: 'password123',
  });
  const payload = decodeJwtPayload(session.accessToken);

  assert.equal(queryParams[0], 'admin@example.com');
  assert.equal(session.tokenType, 'Bearer');
  assert.equal(session.expiresIn, 900);
  assert.equal(session.user.password, undefined);
  assert.equal(payload.sub, '1');
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.roleId, '1');
  assert.equal(payload.branchId, '2');
  assert.equal(typeof payload.iat, 'number');
  assert.equal(payload.exp - payload.iat, 900);
});

test('loginUser rejects invalid credentials', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rows: [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        password: await hashPassword('password123'),
        role_id: '1',
        branch_id: '2',
        status: 'active',
        created_at: new Date('2026-05-10T00:00:00.000Z'),
        updated_at: new Date('2026-05-10T00:00:00.000Z'),
      },
    ],
  });

  await assert.rejects(
    () =>
      authService.loginUser({
        email: 'admin@example.com',
        password: 'wrong-password',
      }),
    {
      message: 'Invalid email or password.',
      statusCode: 401,
    }
  );
});
