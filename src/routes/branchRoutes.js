const { Router } = require('express');

const { deleteBranch, updateBranch } = require('../controllers/branchController');

const router = Router();

router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

module.exports = router;
