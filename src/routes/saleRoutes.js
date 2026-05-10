const { Router } = require('express');

const { createSale } = require('../controllers/saleController');

const router = Router();

router.post('/', createSale);

module.exports = router;
