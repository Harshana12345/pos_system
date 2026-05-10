const employeeService = require('../services/employeeService');

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

module.exports = { listEmployees };
