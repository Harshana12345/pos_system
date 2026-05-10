const assert = require('node:assert');
const test = require('node:test');

const { validateCreateEmployeePayload } = require('../src/validators/employeeValidator');

test('create employee payload validation requires expected fields', () => {
  const errors = validateCreateEmployeePayload({});

  assert.deepEqual(errors, [
    'Name is required.',
    'Email is required.',
    'Password is required.',
    'Role ID must be a positive integer.',
    'Branch ID must be a positive integer.',
  ]);
});

test('create employee payload validation accepts valid optional fields', () => {
  const errors = validateCreateEmployeePayload({
    name: 'Cashier User',
    email: 'cashier@example.com',
    password: 'password123',
    roleId: 3,
    branchId: 1,
    salary: 45000,
    shift: 'morning',
    attendance: {},
    status: 'active',
  });

  assert.deepEqual(errors, []);
});

test('create employee payload validation rejects invalid optional fields', () => {
  const errors = validateCreateEmployeePayload({
    name: 'Cashier User',
    email: 'cashier@example.com',
    password: 'password123',
    roleId: 3,
    branchId: 1,
    salary: -1,
    shift: 123,
    attendance: [],
    status: 'pending',
  });

  assert.deepEqual(errors, [
    'Salary must be a non-negative number.',
    'Shift must be a string.',
    'Attendance must be an object.',
    'Employee status must be active or inactive.',
  ]);
});
