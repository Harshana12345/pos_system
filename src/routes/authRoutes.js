const { Router } = require('express');

const { login, refresh, register } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', register);

module.exports = router;
