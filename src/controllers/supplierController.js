const supplierService = require('../services/supplierService');
const HttpError = require('../utils/httpError');
const {
  validateSupplierId,
  validateSupplierPaymentPayload,
  validateSupplierPayload,
} = require('../validators/supplierValidator');

async function listSuppliers(_req, res, next) {
  try {
    const suppliers = await supplierService.findAll();

    res.status(200).json({
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
}

async function getSupplierPurchaseHistory(req, res, next) {
  const errors = validateSupplierId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const purchases = await supplierService.findPurchaseHistoryById(req.params.id);

    res.status(200).json({
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  const errors = validateSupplierPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const supplier = await supplierService.createSupplier(req.body);

    res.status(201).json({
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
}

async function createSupplierPayment(req, res, next) {
  const errors = [
    ...validateSupplierId(req.params.id),
    ...validateSupplierPaymentPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const payment = await supplierService.createSupplierPayment(
      req.params.id,
      req.user,
      req.body
    );

    res.status(201).json({
      data: payment,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  const errors = [
    ...validateSupplierId(req.params.id),
    ...validateSupplierPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);

    res.status(200).json({
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  const errors = validateSupplierId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await supplierService.deleteSupplier(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSupplierPayment,
  createSupplier,
  deleteSupplier,
  getSupplierPurchaseHistory,
  listSuppliers,
  updateSupplier,
};
