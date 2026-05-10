const { Router } = require('express');

const {
  createSupplierPayment,
  createSupplier,
  deleteSupplier,
  getSupplierPurchaseHistory,
  listSuppliers,
  updateSupplier,
} = require('../controllers/supplierController');

const router = Router();

router.get('/', listSuppliers);
router.get('/:id/purchase-history', getSupplierPurchaseHistory);
router.post('/', createSupplier);
router.post('/:id/payments', createSupplierPayment);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;
