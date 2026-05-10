const { Router } = require('express');

const {
  adjustInventory,
  listInventory,
  listInventoryMovements,
} = require('../controllers/inventoryController');

const router = Router();

router.get('/', listInventory);
router.get('/movements', listInventoryMovements);
router.post('/adjust', adjustInventory);

module.exports = router;
