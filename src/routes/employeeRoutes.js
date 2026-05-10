const { Router } = require('express');

const { listEmployees } = require('../controllers/employeeController');

const router = Router();

router.get('/', listEmployees);

module.exports = router;
