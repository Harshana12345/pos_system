const { Router } = require('express');

const {
  adjustCustomerCreditBalance,
  adjustCustomerLoyaltyPoints,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerCreditBalance,
  getCustomerPurchaseHistory,
  listCustomers,
  updateCustomer,
} = require('../controllers/customerController');

const router = Router();

router.get('/', listCustomers);
router.get('/:id/credit-balance', getCustomerCreditBalance);
router.get('/:id/purchase-history', getCustomerPurchaseHistory);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.post('/:id/credit-balance', adjustCustomerCreditBalance);
router.post('/:id/loyalty-points', adjustCustomerLoyaltyPoints);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
