const customerService = require('../services/customerService');
const HttpError = require('../utils/httpError');
const {
  validateCustomerId,
  validateCustomerPayload,
  validateLoyaltyPointsPayload,
} = require('../validators/customerValidator');

async function listCustomers(_req, res, next) {
  try {
    const customers = await customerService.findAll();

    res.status(200).json({
      data: customers,
    });
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  const errors = validateCustomerId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const customer = await customerService.findById(req.params.id);

    res.status(200).json({
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

async function getCustomerPurchaseHistory(req, res, next) {
  const errors = validateCustomerId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const sales = await customerService.findPurchaseHistoryById(req.params.id);

    res.status(200).json({
      data: sales,
    });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  const errors = validateCustomerPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const customer = await customerService.createCustomer(req.body);

    res.status(201).json({
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  const errors = [
    ...validateCustomerId(req.params.id),
    ...validateCustomerPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);

    res.status(200).json({
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

async function adjustCustomerLoyaltyPoints(req, res, next) {
  const errors = [
    ...validateCustomerId(req.params.id),
    ...validateLoyaltyPointsPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const customer = await customerService.adjustLoyaltyPoints(
      req.params.id,
      req.body
    );

    res.status(200).json({
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  const errors = validateCustomerId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await customerService.deleteCustomer(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  adjustCustomerLoyaltyPoints,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerPurchaseHistory,
  listCustomers,
  updateCustomer,
};
