const { Router } = require('express');

const {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} = require('../controllers/supplierController');

const router = Router();

router.get('/', listSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;
