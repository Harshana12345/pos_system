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
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;
  let selectParams;
  let refreshInsertParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    if (sql.includes('UPDATE users')) {
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes('INSERT INTO refresh_tokens')) {
      refreshInsertParams = params;

      return { rows: [] };
    }

    selectParams = params;

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
          failed_login_attempts: 0,
          locked_at: null,
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
  const refreshPayload = decodeJwtPayload(session.refreshToken);
  const refreshTokenHash = crypto.createHash('sha256').update(session.refreshToken).digest('hex');

  assert.equal(selectParams[0], 'admin@example.com');
  assert.equal(session.tokenType, 'Bearer');
  assert.equal(session.expiresIn, 900);
  assert.equal(session.refreshExpiresIn, 604800);
  assert.equal(session.refreshTokenExpiresAt instanceof Date, true);
  assert.equal(session.user.password, undefined);
  assert.equal(payload.sub, '1');
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.roleId, '1');
  assert.equal(payload.branchId, '2');
  assert.equal(typeof payload.iat, 'number');
  assert.equal(payload.exp - payload.iat, 900);
  assert.equal(refreshPayload.sub, '1');
  assert.equal(refreshPayload.type, 'refresh');
  assert.equal(typeof refreshPayload.jti, 'string');
  assert.equal(refreshPayload.exp - refreshPayload.iat, 604800);
  assert.equal(refreshInsertParams[0], '1');
  assert.equal(refreshInsertParams[1], refreshTokenHash);
  assert.equal(refreshInsertParams[2] instanceof Date, true);
});

test('loginUser rejects invalid credentials', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;
  let updateSql;
  let updateParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    if (sql.includes('UPDATE users')) {
      updateSql = sql;
      updateParams = params;

      return {
        rows: [
          {
            failed_login_attempts: 1,
            locked_at: null,
          },
        ],
      };
    }

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
          failed_login_attempts: 0,
          locked_at: null,
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

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

  assert.match(updateSql, /failed_login_attempts = failed_login_attempts \+ 1/);
  assert.match(updateSql, /locked_at = CASE/);
  assert.equal(updateParams[0], '1');
  assert.equal(updateParams[1], 5);
});

test('loginUser locks an account after 5 consecutive failed attempts', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;
  const lockedAt = new Date('2026-05-10T01:00:00.000Z');

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    if (sql.includes('UPDATE users')) {
      return {
        rows: [
          {
            failed_login_attempts: 5,
            locked_at: lockedAt,
          },
        ],
      };
    }

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
          failed_login_attempts: 4,
          locked_at: null,
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  await assert.rejects(
    () =>
      authService.loginUser({
        email: 'admin@example.com',
        password: 'wrong-password',
      }),
    {
      message: 'User account is locked.',
      statusCode: 423,
    }
  );
});

test('loginUser rejects locked accounts before checking credentials', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const { hashPassword } = require('../src/utils/passwordHash');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql) => {
    if (
      sql.includes('UPDATE users') ||
      sql.includes('INSERT INTO refresh_tokens')
    ) {
      throw new Error('Locked accounts should not be updated or issued tokens.');
    }

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
          failed_login_attempts: 5,
          locked_at: new Date('2026-05-10T01:00:00.000Z'),
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  await assert.rejects(
    () =>
      authService.loginUser({
        email: 'admin@example.com',
        password: 'password123',
      }),
    {
      message: 'User account is locked.',
      statusCode: 423,
    }
  );
});

test('requestPasswordReset stores a hashed reset token and sends email', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const emailService = require('../src/services/emailService');
  const authService = require('../src/services/authService');
  const originalQuery = database.query;
  const originalSendPasswordResetEmail = emailService.sendPasswordResetEmail;
  let selectParams;
  let insertParams;
  let emailPayload;

  t.after(() => {
    database.query = originalQuery;
    emailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
  });

  database.query = async (sql, params) => {
    if (sql.includes('INSERT INTO password_reset_tokens')) {
      insertParams = params;

      return { rows: [] };
    }

    selectParams = params;

    return {
      rows: [
        {
          id: '1',
          email: 'admin@example.com',
        },
      ],
    };
  };

  emailService.sendPasswordResetEmail = async (payload) => {
    emailPayload = payload;
  };

  await authService.requestPasswordReset({
    email: 'ADMIN@EXAMPLE.COM ',
  });

  assert.equal(selectParams[0], 'admin@example.com');
  assert.equal(insertParams[0], '1');
  assert.match(insertParams[1], /^[a-f0-9]{64}$/);
  assert.equal(insertParams[2] instanceof Date, true);
  assert.equal(emailPayload.to, 'admin@example.com');
  assert.match(emailPayload.token, /^[a-f0-9]{64}$/);
  assert.equal(
    insertParams[1],
    crypto.createHash('sha256').update(emailPayload.token).digest('hex')
  );
  assert.equal(emailPayload.expiresInMinutes, 60);
});

test('requestPasswordReset does not reveal missing accounts or send email', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const emailService = require('../src/services/emailService');
  const authService = require('../src/services/authService');
  const originalQuery = database.query;
  const originalSendPasswordResetEmail = emailService.sendPasswordResetEmail;
  let queryCount = 0;

  t.after(() => {
    database.query = originalQuery;
    emailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
  });

  database.query = async (sql) => {
    queryCount += 1;

    if (sql.includes('INSERT INTO password_reset_tokens')) {
      throw new Error('Missing accounts should not get reset tokens.');
    }

    return { rows: [] };
  };

  emailService.sendPasswordResetEmail = async () => {
    throw new Error('Missing accounts should not receive email.');
  };

  await authService.requestPasswordReset({
    email: 'missing@example.com',
  });

  assert.equal(queryCount, 1);
});

test('refreshAccessToken validates stored refresh token and returns a new access token', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const { env } = require('../src/config/env');
  const authService = require('../src/services/authService');
  const { signJwt } = require('../src/utils/jwt');
  const originalQuery = database.query;
  const { token: refreshToken } = signJwt(
    {
      sub: '1',
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  let selectParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (_sql, params) => {
    selectParams = params;

    return {
      rows: [
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          role_id: '1',
          branch_id: '2',
          status: 'active',
          created_at: new Date('2026-05-10T00:00:00.000Z'),
          updated_at: new Date('2026-05-10T00:00:00.000Z'),
        },
      ],
    };
  };

  const session = await authService.refreshAccessToken(refreshToken);
  const payload = decodeJwtPayload(session.accessToken);

  assert.equal(selectParams[0], refreshTokenHash);
  assert.equal(selectParams[1], '1');
  assert.equal(session.tokenType, 'Bearer');
  assert.equal(session.expiresIn, 900);
  assert.equal(session.user.password, undefined);
  assert.equal(payload.sub, '1');
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.roleId, '1');
  assert.equal(payload.branchId, '2');
  assert.equal(payload.exp - payload.iat, 900);
});

test('refreshAccessToken rejects invalid refresh tokens', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => {
    throw new Error('Database should not be queried for an invalid JWT.');
  };

  await assert.rejects(() => authService.refreshAccessToken('not-a-token'), {
    message: 'Invalid refresh token.',
    statusCode: 401,
  });
});

test('refreshAccessToken rejects refresh tokens missing from storage', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const { env } = require('../src/config/env');
  const authService = require('../src/services/authService');
  const { signJwt } = require('../src/utils/jwt');
  const originalQuery = database.query;
  const { token: refreshToken } = signJwt(
    {
      sub: '1',
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rows: [],
  });

  await assert.rejects(() => authService.refreshAccessToken(refreshToken), {
    message: 'Invalid refresh token.',
    statusCode: 401,
  });
});

test('logoutUser revokes a stored refresh token', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const { env } = require('../src/config/env');
  const authService = require('../src/services/authService');
  const { signJwt } = require('../src/utils/jwt');
  const originalQuery = database.query;
  const { token: refreshToken } = signJwt(
    {
      sub: '1',
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  let updateSql;
  let updateParams;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async (sql, params) => {
    updateSql = sql;
    updateParams = params;

    return { rowCount: 1, rows: [] };
  };

  await authService.logoutUser(refreshToken);

  assert.match(updateSql, /UPDATE refresh_tokens/);
  assert.match(updateSql, /revoked_at = CURRENT_TIMESTAMP/);
  assert.equal(updateParams[0], refreshTokenHash);
  assert.equal(updateParams[1], '1');
});

test('logoutUser rejects invalid refresh tokens', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const database = require('../src/config/database');
  const authService = require('../src/services/authService');
  const originalQuery = database.query;

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => {
    throw new Error('Database should not be queried for an invalid JWT.');
  };

  await assert.rejects(() => authService.logoutUser('not-a-token'), {
    message: 'Invalid refresh token.',
    statusCode: 401,
  });
});

test('logoutUser rejects refresh tokens missing from storage', {
  skip: !dependenciesAvailable,
}, async (t) => {
  const crypto = require('crypto');
  const database = require('../src/config/database');
  const { env } = require('../src/config/env');
  const authService = require('../src/services/authService');
  const { signJwt } = require('../src/utils/jwt');
  const originalQuery = database.query;
  const { token: refreshToken } = signJwt(
    {
      sub: '1',
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn,
    }
  );

  t.after(() => {
    database.query = originalQuery;
  });

  database.query = async () => ({
    rowCount: 0,
    rows: [],
  });

  await assert.rejects(() => authService.logoutUser(refreshToken), {
    message: 'Invalid refresh token.',
    statusCode: 401,
  });
});
