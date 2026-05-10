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
    assert.match(queries[1].sql, /e\.deleted_at IS NULL/);
    assert.match(queries[1].sql, /e\.branch_id = \$1/);
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

    assert.match(queries[1].sql, /WHERE e\.deleted_at IS NULL/);
    assert.doesNotMatch(queries[1].sql, /AND e\.branch_id/);
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

test(
  'updateEmployee updates the linked user and employee role assignment in one transaction',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
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

        if (/SELECT id, user_id, branch_id/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21', user_id: '11', branch_id: '4' }] };
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

        if (/UPDATE users/.test(sql)) {
          return { rowCount: 1, rows: [] };
        }

        if (/UPDATE employees/.test(sql)) {
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
              salary: '50000.00',
              shift: 'evening',
              attendance: { daysPresent: 20 },
              status: 'active',
              created_at: new Date('2026-05-01T00:00:00.000Z'),
              updated_at: new Date('2026-05-10T00:00:00.000Z'),
              user_name: 'Senior Cashier',
              user_email: 'senior@example.com',
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

    const employee = await employeeService.updateEmployee(
      {
        roleId: 1,
        branchId: 2,
      },
      '21',
      {
        name: ' Senior Cashier ',
        email: 'SENIOR@EXAMPLE.COM ',
        roleId: '3',
        branchId: '4',
        salary: '50000',
        shift: ' evening ',
        attendance: { daysPresent: 20 },
      }
    );
    const updateUserQuery = queries.find(({ sql }) => /UPDATE users/.test(sql));
    const updateEmployeeQuery = queries.find(({ sql }) => /UPDATE employees/.test(sql));

    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.equal(updateUserQuery.params[0], 11);
    assert.equal(updateUserQuery.params[1], 'Senior Cashier');
    assert.equal(updateUserQuery.params[2], 'senior@example.com');
    assert.equal(updateUserQuery.params[3], 3);
    assert.equal(updateUserQuery.params[4], 4);
    assert.equal(updateEmployeeQuery.params[1], 3);
    assert.equal(updateEmployeeQuery.params[2], 4);
    assert.equal(updateEmployeeQuery.params[3], 50000);
    assert.equal(updateEmployeeQuery.params[4], 'evening');
    assert.equal(employee.id, '21');
    assert.equal(employee.role.name, 'cashier');
    assert.equal(released, true);
  }
);

test(
  'updateEmployee returns not found for missing employees',
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

        if (/SELECT id, user_id, branch_id/.test(sql)) {
          return { rowCount: 0, rows: [] };
        }

        throw new Error('Authorization and updates should not run when employee is missing.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.updateEmployee(
          {
            roleId: 1,
            branchId: 2,
          },
          '99',
          {
            name: 'Cashier User',
            email: 'cashier@example.com',
            roleId: 3,
            branchId: 4,
          }
        ),
      {
        message: 'Employee not found.',
        statusCode: 404,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'deleteEmployee soft deletes an active employee',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
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

        if (/SELECT id, branch_id/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21', branch_id: '4' }] };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'admin' }] };
        }

        if (/UPDATE employees/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21' }] };
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
      release: () => {
        released = true;
      },
    });

    await employeeService.deleteEmployee(
      {
        roleId: 1,
        branchId: 2,
      },
      '21'
    );

    const findEmployeeQuery = queries.find(({ sql }) => /SELECT id, branch_id/.test(sql));
    const updateEmployeeQuery = queries.find(({ sql }) => /UPDATE employees/.test(sql));

    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.match(findEmployeeQuery.sql, /deleted_at IS NULL/);
    assert.match(updateEmployeeQuery.sql, /deleted_at = CURRENT_TIMESTAMP/);
    assert.match(updateEmployeeQuery.sql, /updated_at = CURRENT_TIMESTAMP/);
    assert.match(updateEmployeeQuery.sql, /deleted_at IS NULL/);
    assert.equal(updateEmployeeQuery.params[0], 21);
    assert.equal(released, true);
  }
);

test(
  'deleteEmployee rejects missing or already deleted employees',
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

        if (/SELECT id, branch_id/.test(sql)) {
          return { rowCount: 0, rows: [] };
        }

        throw new Error('Authorization and updates should not run when employee is missing.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.deleteEmployee(
          {
            roleId: 1,
            branchId: 2,
          },
          '99'
        ),
      {
        message: 'Employee not found.',
        statusCode: 404,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'deleteEmployee restricts managers to their own branch',
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

        if (/SELECT id, branch_id/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21', branch_id: '8' }] };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'manager' }] };
        }

        throw new Error('Employee update should not run after authorization fails.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.deleteEmployee(
          {
            roleId: 2,
            branchId: 7,
          },
          '21'
        ),
      {
        message: 'Managers can only delete employees for their branch.',
        statusCode: 403,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'checkInEmployee appends an open attendance record',
  {
    skip: !dependenciesAvailable,
  },
  async (t) => {
    const database = require('../src/config/database');
    const employeeService = require('../src/services/employeeService');
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

        if (/SELECT id, user_id, branch_id, attendance/.test(sql)) {
          return {
            rowCount: 1,
            rows: [{ id: '21', user_id: '11', branch_id: '4', attendance: { records: [] } }],
          };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'admin' }] };
        }

        if (/UPDATE employees/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21' }] };
        }

        if (/SELECT e\.id/.test(sql)) {
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
                attendance: queries.find(({ sql: querySql }) => /UPDATE employees/.test(querySql))
                  .params[1],
                status: 'active',
                created_at: new Date('2026-05-01T00:00:00.000Z'),
                updated_at: new Date('2026-05-10T00:00:00.000Z'),
                user_name: 'Cashier User',
                user_email: 'cashier@example.com',
                user_status: 'active',
                role_name: 'cashier',
                branch_name: 'Main',
              },
            ],
          };
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
      release: () => {
        released = true;
      },
    });

    const employee = await employeeService.checkInEmployee(
      {
        id: 1,
        roleId: 1,
        branchId: 2,
      },
      '21'
    );
    const findEmployeeQuery = queries.find(({ sql }) =>
      /SELECT id, user_id, branch_id, attendance/.test(sql)
    );
    const updateEmployeeQuery = queries.find(({ sql }) => /UPDATE employees/.test(sql));

    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.match(findEmployeeQuery.sql, /FOR UPDATE/);
    assert.equal(updateEmployeeQuery.params[0], 21);
    assert.equal(updateEmployeeQuery.params[1].currentStatus, 'checked_in');
    assert.equal(updateEmployeeQuery.params[1].records.length, 1);
    assert.equal(updateEmployeeQuery.params[1].records[0].checkOut, null);
    assert.equal(employee.attendance.currentStatus, 'checked_in');
    assert.equal(released, true);
  }
);

test(
  'checkInEmployee rejects employees that are already checked in',
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

        if (/SELECT id, user_id, branch_id, attendance/.test(sql)) {
          return {
            rowCount: 1,
            rows: [
              {
                id: '21',
                user_id: '11',
                branch_id: '4',
                attendance: { records: [{ checkIn: '2026-05-10T08:00:00.000Z', checkOut: null }] },
              },
            ],
          };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'admin' }] };
        }

        throw new Error('Employee update should not run when already checked in.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.checkInEmployee(
          {
            id: 1,
            roleId: 1,
            branchId: 2,
          },
          '21'
        ),
      {
        message: 'Employee is already checked in.',
        statusCode: 409,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'checkOutEmployee closes the latest open attendance record',
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

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rowCount: 0, rows: [] };
        }

        if (/SELECT id, user_id, branch_id, attendance/.test(sql)) {
          return {
            rowCount: 1,
            rows: [
              {
                id: '21',
                user_id: '11',
                branch_id: '4',
                attendance: {
                  records: [{ checkIn: '2026-05-10T08:00:00.000Z', checkOut: null }],
                },
              },
            ],
          };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'cashier' }] };
        }

        if (/UPDATE employees/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21' }] };
        }

        if (/SELECT e\.id/.test(sql)) {
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
                attendance: queries.find(({ sql: querySql }) => /UPDATE employees/.test(querySql))
                  .params[1],
                status: 'active',
                created_at: new Date('2026-05-01T00:00:00.000Z'),
                updated_at: new Date('2026-05-10T00:00:00.000Z'),
                user_name: 'Cashier User',
                user_email: 'cashier@example.com',
                user_status: 'active',
                role_name: 'cashier',
                branch_name: 'Main',
              },
            ],
          };
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
      release: () => {},
    });

    const employee = await employeeService.checkOutEmployee(
      {
        id: 11,
        roleId: 3,
        branchId: 4,
      },
      '21'
    );
    const updateEmployeeQuery = queries.find(({ sql }) => /UPDATE employees/.test(sql));

    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.equal(updateEmployeeQuery.params[1].currentStatus, 'checked_out');
    assert.ok(updateEmployeeQuery.params[1].records[0].checkOut);
    assert.equal(employee.attendance.currentStatus, 'checked_out');
  }
);

test(
  'checkOutEmployee restricts managers to their own branch',
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

        if (/SELECT id, user_id, branch_id, attendance/.test(sql)) {
          return {
            rowCount: 1,
            rows: [{ id: '21', user_id: '11', branch_id: '8', attendance: { records: [] } }],
          };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'manager' }] };
        }

        throw new Error('Employee update should not run after authorization fails.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.checkOutEmployee(
          {
            id: 2,
            roleId: 2,
            branchId: 7,
          },
          '21'
        ),
      {
        message: 'Managers can only track attendance for their branch.',
        statusCode: 403,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);

test(
  'updateEmployee rolls back duplicate user emails',
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

        if (/SELECT id, user_id, branch_id/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21', user_id: '11', branch_id: '4' }] };
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

        if (/UPDATE users/.test(sql)) {
          const error = new Error('duplicate key value violates unique constraint');
          error.code = '23505';
          throw error;
        }

        throw new Error('Employee update should not run after duplicate user email.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.updateEmployee(
          {
            roleId: 1,
            branchId: 2,
          },
          '21',
          {
            name: 'Cashier User',
            email: 'cashier@example.com',
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
  'updateEmployee restricts managers to their own branch',
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

        if (/SELECT id, user_id, branch_id/.test(sql)) {
          return { rowCount: 1, rows: [{ id: '21', user_id: '11', branch_id: '7' }] };
        }

        if (/FROM roles/.test(sql)) {
          return { rowCount: 1, rows: [{ name: 'manager' }] };
        }

        throw new Error('Role, branch, and updates should not run after authorization fails.');
      },
      release: () => {},
    });

    await assert.rejects(
      () =>
        employeeService.updateEmployee(
          {
            roleId: 2,
            branchId: 7,
          },
          '21',
          {
            name: 'Cashier User',
            email: 'cashier@example.com',
            roleId: 3,
            branchId: 8,
          }
        ),
      {
        message: 'Managers can only update employees for their branch.',
        statusCode: 403,
      }
    );

    assert.equal(queries.at(-1).sql, 'ROLLBACK');
  }
);
