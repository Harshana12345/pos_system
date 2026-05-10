const { Router } = require('express');

const { createEmployee, listEmployees } = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);
router.post('/', createEmployee);

module.exports = router;
