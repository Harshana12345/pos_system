const { Router } = require('express');

const {
  createSale,
  getSale,
  listSales,
  refundSale,
} = require('../controllers/saleController');

const router = Router();

router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.post('/refund', refundSale);

module.exports = router;
