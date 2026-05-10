const { Router } = require('express');

const { createSale, getSale, listSales } = require('../controllers/saleController');

const router = Router();

router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', createSale);

module.exports = router;
