const { Router } = require('express');

const {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword,
} = require('../controllers/authController');

const router = Router();

router.post('/forgot-password', forgotPassword);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/register', register);
router.post('/reset-password', resetPassword);

module.exports = router;
