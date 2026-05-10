const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

test(
  'createEmployee creates a user and employee in one transaction',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const { verifyPassword } = require('../src/utils/passwordHash');
    const originalConnect = database.pool.connect;
    const queries = [];
    let released = false;

    t.after(() => {
      database.pool.connect = originalConnect;
    });

    database.pool.connect = async () => ({
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rowCount: 0, rows: [] };
        }

        if (/FROM roles/.test(sql) && params[0] === 1) {
          return { rowCount: 1, rows: [{ name: 'admin' }] };
        }

        if (/FROM roles/.test(sql) && params[0] === 3) {
          return { rowCount: 1, rows: [{ id: '3' }] };
        }

        if (/FROM branches/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '4' }] };
        }

        if (/INSERT INTO users/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '11' }] };
        }

        if (/INSERT INTO employees/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21' }] };
        }

        return {
          rowCount: 1,
          rows: [
            {
              id: '21',
              user_id: '11',
              role_id: '3',
              branch_id: '4',
              salary: '45000.00',
              shift: 'morning',
              attendance: {},
              status: 'active',
              created_at: new Date('2026-05-10T00:00:00.000Z'),
              updated_at: new Date('2026-05-10T00:00:00.000Z'),
              user_name: 'Cashier User',
              user_email: 'cashier@example.com',
              user_status: 'active',
              role_name: 'cashier',
              branch_name: 'Main',
            },
          ],
        };
      },
      release: () => {
        released = true;
      },
    });

    const employee = await employeeService.createEmployee(
      {
        roleId: 1,
        branchId: 2,
      },
      {
        name: ' Cashier User ',
        email: 'CASHIER@EXAMPLE.COM ',
        password: 'password123',
        roleId: '3',
        branchId: '4',
        salary: '45000',
        shift: ' morning ',
      }
    );
    const insertUserQuery = queries.find(({ sql }) => /INSERT INTO users/.test(sql));
    const insertEmployeeQuery = queries.find(({ sql }) => /INSERT INTO employees/.test(sql));

    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.equal(insertUserQuery.params[0], 'Cashier User');
    assert.equal(insertUserQuery.params[1], 'cashier@example.com');
    assert.equal(await verifyPassword('password123', insertUserQuery.params[2]), true);
    assert.equal(insertUserQuery.params[3], 3);
    assert.equal(insertUserQuery.params[4], 4);
    assert.equal(insertEmployeeQuery.params[0], '11');
    assert.equal(insertEmployeeQuery.params[3], 45000);
    assert.equal(insertEmployeeQuery.params[4], 'morning');
    assert.equal(employee.id, '21');
    assert.equal(employee.user.email, 'cashier@example.com');
    assert.equal(employee.user.password, undefined);
    assert.equal(released, true);
  }
);

test(
  'createEmployee rolls back duplicate user emails',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const originalConnect = database.pool.connect;
    const queries = [];

    t.after(() => {
      database.pool.connect = originalConnect;
    });

    database.pool.connect = async () => ({
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return { rowCount: 0, rows: [] };
        }

        if (/FROM roles/.test(sql) && params[0] === 1) {
          return { rowCount: 1, rows: [{ name: 'admin' }] };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '3' }] };
        }

        if (/FROM branches/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '4' }] };
        }

        if (/INSERT INTO users/.test(sql)) {
          const error = new Error('duplicate key value violates unique constraint');
          error.code = '23505';
          throw error;
        }

        throw new Error('Employee insert should not run after a duplicate email.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.createEmployee(
          {
            roleId: 1,
            branchId: 2,
          },
          {
            name: 'Cashier User',
            email: 'cashier@example.com',
            password: 'password123',
            roleId: 3,
            branchId: 4,
          }
        ),
      {
        message: 'A user with this email already exists.',
        statusCode: 409,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'createEmployee restricts managers to their own branch',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const originalConnect = database.pool.connect;
    const queries = [];

    t.after(() => {
      database.pool.connect = originalConnect;
    });

    database.pool.connect = async () => ({
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return { rowCount: 0, rows: [] };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'manager' }] };
        }

        throw new Error('Branch and user inserts should not run after authorization fails.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.createEmployee(
          {
            roleId: 2,
            branchId: 7,
          },
          {
            name: 'Cashier User',
            email: 'cashier@example.com',
            password: 'password123',
            roleId: 3,
            branchId: 8,
          }
        ),
      {
        message: 'Managers can only create employees for their branch.',
        statusCode: 403,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'findAllForUser filters employees to the manager branch',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const originalQuery = database.query;
    const queries = [];

    t.after(() => {
      database.query = originalQuery;
    });

    database.query = async (sql, params) => {
      queries.push({ sql, params });

      if (/FROM roles/.test(sql)) {
        return { rowCount: 1, rows: [{ name: 'manager' }] };
      }

      return { rowCount: 0, rows: [] };
    };

    const employees = await employeeService.findAllForUser({
      roleId: 2,
      branchId: 7,
    });

    assert.deepEqual(employees, []);
    assert.match(queries[1].sql, /WHERE e\.branch_id = \$1/);
    assert.deepEqual(queries[1].params, [7]);
  }
);

test(
  'findAllForUser does not branch-filter non-manager roles',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const originalQuery = database.query;
    const queries = [];

    t.after(() => {
      database.query = originalQuery;
    });

    database.query = async (sql, params) => {
      queries.push({ sql, params });

      if (/FROM roles/.test(sql)) {
        return { rowCount: 1, rows: [{ name: 'admin' }] };
      }

      return {
        rowCount: 1,
        rows: [
          {
            id: '1',
            user_id: '2',
            role_id: '3',
            branch_id: '4',
            salary: '50000.00',
            shift: 'morning',
            attendance: {},
            status: 'active',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-02T00:00:00.000Z'),
            user_name: 'Ada Lovelace',
            user_email: 'ada@example.com',
            user_status: 'active',
            role_name: 'cashier',
            branch_name: 'Main',
          },
        ],
      };
    };

    const employees = await employeeService.findAllForUser({
      roleId: 1,
      branchId: 7,
    });

    assert.doesNotMatch(queries[1].sql, /WHERE e\.branch_id/);
    assert.deepEqual(queries[1].params, []);
    assert.equal(employees[0].user.name, 'Ada Lovelace');
    assert.equal(employees[0].branch.name, 'Main');
  }
);

test(
  'findAllForUser rejects unknown authenticated roles',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
    const originalQuery = database.query;

    t.after(() => {
      database.query = originalQuery;
    });

    database.query = async () => ({ rowCount: 0, rows: [] });

    await assert.rejects(
      () =>
        employeeService.findAllForUser({
          roleId: 99,
          branchId: 7,
        }),
      {
        message: 'Authenticated user role is not recognized.',
        statusCode: 403,
      }
    );
  }
);
