const { Router } = require('express');

const {
  approvePurchase,
  createPurchase,
  receivePurchase,
} = require('../controllers/purchaseController');

const router = Router();

router.post('/', createPurchase);
router.post('/:id/receive', receivePurchase);
router.put('/:id/approve', approvePurchase);

module.exports = router;
