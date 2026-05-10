const { Router } = require('express');

const {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
