const { Router } = require('express');

const {
  adjustInventory,
  listExpiringInventory,
  listInventory,
  listInventoryMovements,
  listLowStockInventory,
} = require('../controllers/inventoryController');

const router = Router();

router.get('/expiring', listExpiringInventory);
router.get('/low-stock', listLowStockInventory);
router.get('/', listInventory);
router.get('/movements', listInventoryMovements);
router.post('/adjust', adjustInventory);

module.exports = router;
