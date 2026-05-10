const { Router } = require('express');

const {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
} = require('../controllers/authController');

const router = Router();

router.post('/forgot-password', forgotPassword);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/register', register);

module.exports = router;
