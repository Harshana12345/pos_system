const { Router } = require('express');

const { authenticateJwt } = require('../middleware/authenticateJwt');
const authRoutes = require('./authRoutes');
const brandRoutes = require('./brandRoutes');
const branchRoutes = require('./branchRoutes');
const categoryRoutes = require('./categoryRoutes');
const employeeRoutes = require('./employeeRoutes');
const healthRoutes = require('./healthRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const productRoutes = require('./productRoutes');
const supplierRoutes = require('./supplierRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use(authenticateJwt);
router.use('/brands', brandRoutes);
router.use('/branches', branchRoutes);
router.use('/categories', categoryRoutes);
router.use('/employees', employeeRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);

module.exports = router;
