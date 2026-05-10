const saleService = require('../services/saleService');
const HttpError = require('../utils/httpError');
const {
  validateRefundPayload,
  validateSaleFilters,
  validateSalePayload,
} = require('../validators/saleValidator');

function isPositiveInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0;
}

async function listSales(req, res, next) {
  const errors = validateSaleFilters(req.query);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const sales = await saleService.findAll(req.query);

    res.status(200).json({
      data: sales,
    });
  } catch (error) {
    next(error);
  }
}

async function getSale(req, res, next) {
  if (!isPositiveInteger(req.params.id)) {
    next(new HttpError(400, 'Sale ID must be a positive integer.'));
    return;
  }

  try {
    const sale = await saleService.findById(Number(req.params.id));

    res.status(200).json({
      data: sale,
    });
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  const errors = validateSalePayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const sale = await saleService.createCompletedSale(req.user, req.body);

    res.status(201).json({
      data: sale,
    });
  } catch (error) {
    next(error);
  }
}

async function refundSale(req, res, next) {
  const errors = validateRefundPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const refund = await saleService.processRefund(req.user, req.body);

    res.status(201).json({
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSale,
  getSale,
  listSales,
  refundSale,
};
