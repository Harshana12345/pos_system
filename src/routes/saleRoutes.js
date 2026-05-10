const { Router } = require('express');

const {
  createSale,
  getSale,
  listSales,
  refundSale,
  resumeSale,
  suspendSale,
} = require('../controllers/saleController');

const router = Router();

router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.post('/refund', refundSale);
router.post('/resume', resumeSale);
router.post('/suspend', suspendSale);

module.exports = router;
