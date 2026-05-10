const database = require('../config/database');
const Employee = require('../models/Employee');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/passwordHash');

function mapEmployeeRow(row) {
  return new Employee({
    id: row.id,
    userId: row.user_id,
    roleId: row.role_id,
    branchId: row.branch_id,
    salary: row.salary,
    shift: row.shift,
    attendance: row.attendance,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      status: row.user_status,
    },
    role: {
      id: row.role_id,
      name: row.role_name,
    },
    branch: {
      id: row.branch_id,
      name: row.branch_name,
    },
  });
}

async function findRequesterRoleName(roleId) {
  const result = await database.query(
    `SELECT name
     FROM roles
     WHERE id = $1
     LIMIT 1`,
    [Number(roleId)]
  );

  return result.rows[0]?.name;
}

async function ensureRequesterCanCreateEmployee(client, requester, branchId) {
  const result = await client.query(
    `SELECT name
     FROM roles
     WHERE id = $1
     LIMIT 1`,
    [Number(requester.roleId)]
  );
  const requesterRoleName = result.rows[0]?.name;

  if (!requesterRoleName) {
    throw new HttpError(403, 'Authenticated user role is not recognized.');
  }

  if (!['admin', 'manager'].includes(requesterRoleName)) {
    throw new HttpError(403, 'You are not allowed to create employees.');
  }

  if (requesterRoleName === 'manager' && Number(requester.branchId) !== Number(branchId)) {
    throw new HttpError(403, 'Managers can only create employees for their branch.');
  }
}

async function ensureRoleExists(client, roleId) {
  const result = await client.query(
    `SELECT id
     FROM roles
     WHERE id = $1
     LIMIT 1`,
    [Number(roleId)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(400, 'Role does not exist.');
  }
}

async function ensureBranchExists(client, branchId) {
  const result = await client.query(
    `SELECT id
     FROM branches
     WHERE id = $1
       AND status = 'active'
       AND deleted_at IS NULL
     LIMIT 1`,
    [Number(branchId)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(400, 'Branch does not exist or is inactive.');
  }
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

async function createEmployee(
  requester,
  { name, email, password, roleId, branchId, salary, shift, attendance, status }
) {
  const client = await database.pool.connect();
  const passwordHash = await hashPassword(password);

  try {
    await client.query('BEGIN');
    await ensureRequesterCanCreateEmployee(client, requester, branchId);
    await ensureRoleExists(client, roleId);
    await ensureBranchExists(client, branchId);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role_id, branch_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        Number(roleId),
        Number(branchId),
        status || 'active',
      ]
    );
    const userId = userResult.rows[0].id;
    const employeeResult = await client.query(
      `INSERT INTO employees (user_id, role_id, branch_id, salary, shift, attendance, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        Number(roleId),
        Number(branchId),
        salary === undefined ? 0 : Number(salary),
        normalizeNullableString(shift),
        attendance || {},
        status || 'active',
      ]
    );
    const result = await client.query(
      `SELECT e.id,
              e.user_id,
              e.role_id,
              e.branch_id,
              e.salary,
              e.shift,
              e.attendance,
              e.status,
              e.created_at,
              e.updated_at,
              u.name AS user_name,
              u.email AS user_email,
              u.status AS user_status,
              r.name AS role_name,
              b.name AS branch_name
       FROM employees e
       INNER JOIN users u ON u.id = e.user_id
       INNER JOIN roles r ON r.id = e.role_id
       INNER JOIN branches b ON b.id = e.branch_id
       WHERE e.id = $1
       LIMIT 1`,
      [employeeResult.rows[0].id]
    );

    await client.query('COMMIT');

    return mapEmployeeRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new HttpError(409, 'A user with this email already exists.');
    }

    throw error;
  } finally {
    client.release();
  }
}

async function findAllForUser(user) {
  const requesterRoleName = await findRequesterRoleName(user.roleId);

  if (!requesterRoleName) {
    throw new HttpError(403, 'Authenticated user role is not recognized.');
  }

  const params = [];
  const branchFilter = requesterRoleName === 'manager' ? 'WHERE e.branch_id = $1' : '';

  if (requesterRoleName === 'manager') {
    params.push(Number(user.branchId));
  }

  const result = await database.query(
    `SELECT e.id,
            e.user_id,
            e.role_id,
            e.branch_id,
            e.salary,
            e.shift,
            e.attendance,
            e.status,
            e.created_at,
            e.updated_at,
            u.name AS user_name,
            u.email AS user_email,
            u.status AS user_status,
            r.name AS role_name,
            b.name AS branch_name
     FROM employees e
     INNER JOIN users u ON u.id = e.user_id
     INNER JOIN roles r ON r.id = e.role_id
     INNER JOIN branches b ON b.id = e.branch_id
     ${branchFilter}
     ORDER BY e.id ASC`,
    params
  );

  return result.rows.map(mapEmployeeRow);
}

module.exports = { createEmployee, findAllForUser, mapEmployeeRow };
