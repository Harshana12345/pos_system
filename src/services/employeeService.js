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

async function ensureRequesterCanUpdateEmployee(client, requester, currentBranchId, nextBranchId) {
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
    throw new HttpError(403, 'You are not allowed to update employees.');
  }

  if (
    requesterRoleName === 'manager' &&
    (Number(requester.branchId) !== Number(currentBranchId) ||
      Number(requester.branchId) !== Number(nextBranchId))
  ) {
    throw new HttpError(403, 'Managers can only update employees for their branch.');
  }
}

async function ensureRequesterCanDeleteEmployee(client, requester, branchId) {
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
    throw new HttpError(403, 'You are not allowed to delete employees.');
  }

  if (requesterRoleName === 'manager' && Number(requester.branchId) !== Number(branchId)) {
    throw new HttpError(403, 'Managers can only delete employees for their branch.');
  }
}

async function ensureRequesterCanTrackAttendance(client, requester, employee) {
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

  if (requesterRoleName === 'admin') {
    return;
  }

  if (requesterRoleName === 'manager') {
    if (Number(requester.branchId) !== Number(employee.branch_id)) {
      throw new HttpError(403, 'Managers can only track attendance for their branch.');
    }

    return;
  }

  if (Number(requester.id) !== Number(employee.user_id)) {
    throw new HttpError(403, 'You can only track your own attendance.');
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

function normalizeAttendance(attendance) {
  if (!attendance || typeof attendance !== 'object' || Array.isArray(attendance)) {
    return {};
  }

  return attendance;
}

function getAttendanceRecords(attendance) {
  return Array.isArray(attendance.records) ? attendance.records : [];
}

function buildAttendanceCheckIn(attendance, checkedInAt) {
  const normalizedAttendance = normalizeAttendance(attendance);
  const records = getAttendanceRecords(normalizedAttendance);
  const openRecord = records.find((record) => record && !record.checkOut);

  if (openRecord) {
    throw new HttpError(409, 'Employee is already checked in.');
  }

  return {
    ...normalizedAttendance,
    records: [
      ...records,
      {
        checkIn: checkedInAt,
        checkOut: null,
      },
    ],
    currentStatus: 'checked_in',
    lastCheckInAt: checkedInAt,
  };
}

function buildAttendanceCheckOut(attendance, checkedOutAt) {
  const normalizedAttendance = normalizeAttendance(attendance);
  const records = getAttendanceRecords(normalizedAttendance);
  let openRecordIndex = -1;

  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index] && !records[index].checkOut) {
      openRecordIndex = index;
      break;
    }
  }

  if (openRecordIndex === -1) {
    throw new HttpError(409, 'Employee is not checked in.');
  }

  return {
    ...normalizedAttendance,
    records: records.map((record, index) =>
      index === openRecordIndex
        ? {
            ...record,
            checkOut: checkedOutAt,
          }
        : record
    ),
    currentStatus: 'checked_out',
    lastCheckOutAt: checkedOutAt,
  };
}

async function findEmployeeForAttendance(client, id) {
  const result = await client.query(
    `SELECT id, user_id, branch_id, attendance
     FROM employees
     WHERE id = $1
       AND deleted_at IS NULL
     FOR UPDATE`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Employee not found.');
  }

  return result.rows[0];
}

async function findEmployeeDetailsById(client, id) {
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
    [Number(id)]
  );

  return mapEmployeeRow(result.rows[0]);
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

async function updateAttendance(requester, id, buildNextAttendance) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const existingEmployee = await findEmployeeForAttendance(client, id);

    await ensureRequesterCanTrackAttendance(client, requester, existingEmployee);

    const nextAttendance = buildNextAttendance(
      existingEmployee.attendance,
      new Date().toISOString()
    );
    const updateResult = await client.query(
      `UPDATE employees
       SET attendance = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [Number(id), nextAttendance]
    );

    if (updateResult.rowCount === 0) {
      throw new HttpError(404, 'Employee not found.');
    }

    const employee = await findEmployeeDetailsById(client, updateResult.rows[0].id);

    await client.query('COMMIT');

    return employee;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function checkInEmployee(requester, id) {
  return updateAttendance(requester, id, buildAttendanceCheckIn);
}

async function checkOutEmployee(requester, id) {
  return updateAttendance(requester, id, buildAttendanceCheckOut);
}

async function updateEmployee(
  requester,
  id,
  { name, email, roleId, branchId, salary, shift, attendance, status }
) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `SELECT id, user_id, branch_id
       FROM employees
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [Number(id)]
    );

    if (existingResult.rowCount === 0) {
      throw new HttpError(404, 'Employee not found.');
    }

    const existingEmployee = existingResult.rows[0];

    await ensureRequesterCanUpdateEmployee(
      client,
      requester,
      existingEmployee.branch_id,
      branchId
    );
    await ensureRoleExists(client, roleId);
    await ensureBranchExists(client, branchId);

    await client.query(
      `UPDATE users
       SET name = $2,
           email = $3,
           role_id = $4,
           branch_id = $5,
           status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        Number(existingEmployee.user_id),
        name.trim(),
        email.trim().toLowerCase(),
        Number(roleId),
        Number(branchId),
        status || 'active',
      ]
    );

    const employeeResult = await client.query(
      `UPDATE employees
       SET role_id = $2,
           branch_id = $3,
           salary = $4,
           shift = $5,
           attendance = $6,
           status = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [
        Number(id),
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
  const conditions = ['e.deleted_at IS NULL'];

  if (requesterRoleName === 'manager') {
    params.push(Number(user.branchId));
    conditions.push(`e.branch_id = $${params.length}`);
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
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.id ASC`,
    params
  );

  return result.rows.map(mapEmployeeRow);
}

async function deleteEmployee(requester, id) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `SELECT id, branch_id
       FROM employees
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [Number(id)]
    );

    if (existingResult.rowCount === 0) {
      throw new HttpError(404, 'Employee not found.');
    }

    await ensureRequesterCanDeleteEmployee(client, requester, existingResult.rows[0].branch_id);

    const result = await client.query(
      `UPDATE employees
       SET deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Employee not found.');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  checkInEmployee,
  checkOutEmployee,
  createEmployee,
  deleteEmployee,
  findAllForUser,
  mapEmployeeRow,
  updateEmployee,
};
