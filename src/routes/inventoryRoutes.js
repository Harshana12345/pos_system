const { Router } = require('express');

const { listInventory } = require('../controllers/inventoryController');

const router = Router();

router.get('/', listInventory);

module.exports = router;
