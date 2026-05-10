const { Router } = require('express');

const {
  assignEmployeeShift,
  checkInEmployee,
  checkOutEmployee,
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeShift,
} = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);
router.post('/:id/check-in', checkInEmployee);
router.post('/:id/check-out', checkOutEmployee);
router.post('/:id/shift', assignEmployeeShift);
router.put('/:id/shift', updateEmployeeShift);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
