const saleService = require('../services/saleService');
const HttpError = require('../utils/httpError');
const { validateSaleFilters, validateSalePayload } = require('../validators/saleValidator');

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

module.exports = {
  createSale,
  listSales,
};
