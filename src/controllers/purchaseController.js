const purchaseService = require('../services/purchaseService');
const HttpError = require('../utils/httpError');
const { validatePurchasePayload } = require('../validators/purchaseValidator');

async function createPurchase(req, res, next) {
  const errors = validatePurchasePayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const purchase = await purchaseService.createPurchaseOrder(req.user, req.body);

    res.status(201).json({
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPurchase,
};
