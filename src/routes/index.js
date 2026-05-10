const { Router } = require('express');

const healthRoutes = require('./healthRoutes');
const productRoutes = require('./productRoutes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/products', productRoutes);

module.exports = router;

