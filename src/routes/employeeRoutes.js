const { Router } = require('express');

const { createEmployee, listEmployees, updateEmployee } = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);

module.exports = router;
