const { Router } = require('express');

const { createSale, listSales } = require('../controllers/saleController');

const router = Router();

router.get('/', listSales);
router.post('/', createSale);

module.exports = router;
