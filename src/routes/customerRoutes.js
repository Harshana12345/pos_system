const { Router } = require('express');

const {
  adjustCustomerLoyaltyPoints,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerPurchaseHistory,
  listCustomers,
  updateCustomer,
} = require('../controllers/customerController');

const router = Router();

router.get('/', listCustomers);
router.get('/:id/purchase-history', getCustomerPurchaseHistory);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.post('/:id/loyalty-points', adjustCustomerLoyaltyPoints);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
