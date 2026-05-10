const purchaseService = require('../services/purchaseService');
const HttpError = require('../utils/httpError');
const { validatePurchasePayload } = require('../validators/purchaseValidator');

function isPositiveInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0;
}

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

async function approvePurchase(req, res, next) {
  if (!isPositiveInteger(req.params.id)) {
    next(new HttpError(400, 'Purchase order ID must be a positive integer.'));
    return;
  }

  try {
    const purchase = await purchaseService.approvePurchaseOrder(Number(req.params.id));

    res.status(200).json({
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
}

async function receivePurchase(req, res, next) {
  if (!isPositiveInteger(req.params.id)) {
    next(new HttpError(400, 'Purchase order ID must be a positive integer.'));
    return;
  }

  try {
    const purchase = await purchaseService.receivePurchaseOrder(
      { ...req.user, items: req.body?.items },
      Number(req.params.id)
    );

    res.status(200).json({
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approvePurchase,
  createPurchase,
  receivePurchase,
};
