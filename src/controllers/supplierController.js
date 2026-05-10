const supplierService = require('../services/supplierService');
const HttpError = require('../utils/httpError');
const {
  validateSupplierId,
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
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
};
