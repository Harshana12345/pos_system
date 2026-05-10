const { Router } = require('express');

const { updateBranch } = require('../controllers/branchController');

const router = Router();

router.put('/:id', updateBranch);

module.exports = router;
