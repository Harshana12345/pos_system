const employeeService = require('../services/employeeService');
const HttpError = require('../utils/httpError');
const {
  validateCreateEmployeePayload,
  validateEmployeeId,
  validateShiftPayload,
  validateUpdateEmployeePayload,
} = require('../validators/employeeValidator');

async function createEmployee(req, res, next) {
  const errors = validateCreateEmployeePayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.createEmployee(req.user, req.body);

    res.status(201).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

async function listEmployees(req, res, next) {
  try {
    const employees = await employeeService.findAllForUser(req.user);

    res.status(200).json({
      data: employees,
    });
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  const errors = [
    ...validateEmployeeId(req.params.id),
    ...validateUpdateEmployeePayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.updateEmployee(req.user, req.params.id, req.body);

    res.status(200).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteEmployee(req, res, next) {
  const errors = validateEmployeeId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await employeeService.deleteEmployee(req.user, req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function assignEmployeeShift(req, res, next) {
  const errors = [...validateEmployeeId(req.params.id), ...validateShiftPayload(req.body)];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.assignEmployeeShift(
      req.user,
      req.params.id,
      req.body.shift
    );

    res.status(200).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

async function updateEmployeeShift(req, res, next) {
  const errors = [...validateEmployeeId(req.params.id), ...validateShiftPayload(req.body)];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.updateEmployeeShift(
      req.user,
      req.params.id,
      req.body.shift
    );

    res.status(200).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

async function checkInEmployee(req, res, next) {
  const errors = validateEmployeeId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.checkInEmployee(req.user, req.params.id);

    res.status(200).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

async function checkOutEmployee(req, res, next) {
  const errors = validateEmployeeId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const employee = await employeeService.checkOutEmployee(req.user, req.params.id);

    res.status(200).json({
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assignEmployeeShift,
  checkInEmployee,
  checkOutEmployee,
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeShift,
};
