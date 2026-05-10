const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('pg');
} catch {
  dependenciesAvailable = false;
}

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
