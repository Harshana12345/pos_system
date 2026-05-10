const { Router } = require('express');

const {
  checkInEmployee,
  checkOutEmployee,
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);
router.post('/:id/check-in', checkInEmployee);
router.post('/:id/check-out', checkOutEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
