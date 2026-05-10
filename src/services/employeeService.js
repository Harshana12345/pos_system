const database = require('../config/database');
const Employee = require('../models/Employee');
const HttpError = require('../utils/httpError');

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

module.exports = { findAllForUser, mapEmployeeRow };
