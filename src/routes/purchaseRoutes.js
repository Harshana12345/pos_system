const { Router } = require('express');

const { approvePurchase, createPurchase } = require('../controllers/purchaseController');

const router = Router();

router.post('/', createPurchase);
router.put('/:id/approve', approvePurchase);

module.exports = router;
