const { Router } = require('express');

const { adjustInventory, listInventory } = require('../controllers/inventoryController');

const router = Router();

router.get('/', listInventory);
router.post('/adjust', adjustInventory);

module.exports = router;
