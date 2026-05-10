const { Router } = require('express');

const { createPurchase } = require('../controllers/purchaseController');

const router = Router();

router.post('/', createPurchase);

module.exports = router;
