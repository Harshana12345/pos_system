const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('bcrypt');
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
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
