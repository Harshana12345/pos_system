const { Router } = require('express');

const { listProducts } = require('../controllers/productController');

const router = Router();

router.get('/', listProducts);

module.exports = router;

