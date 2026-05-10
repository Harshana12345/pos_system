const { Router } = require('express');

const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const productRoutes = require('./productRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/products', productRoutes);

module.exports = router;
