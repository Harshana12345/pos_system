const { Router } = require('express');

const {
  adjustInventory,
  listInventory,
  listInventoryMovements,
  listLowStockInventory,
} = require('../controllers/inventoryController');

const router = Router();

router.get('/low-stock', listLowStockInventory);
router.get('/', listInventory);
router.get('/movements', listInventoryMovements);
router.post('/adjust', adjustInventory);

module.exports = router;
