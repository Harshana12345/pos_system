const { Router } = require('express');

const { authenticateJwt } = require('../middleware/authenticateJwt');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const productRoutes = require('./productRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use(authenticateJwt);
router.use('/products', productRoutes);

module.exports = router;
