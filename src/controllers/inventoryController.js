const inventoryService = require('../services/inventoryService');
const HttpError = require('../utils/httpError');
const {
  validateInventoryAdjustmentPayload,
  validateInventoryFilters,
  validateInventoryMovementFilters,
} = require('../validators/inventoryValidator');

async function listInventory(req, res, next) {
  const errors = validateInventoryFilters(req.query);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const inventory = await inventoryService.findAll(req.query);

    res.status(200).json({
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
}

async function listInventoryMovements(req, res, next) {
  const errors = validateInventoryMovementFilters(req.query);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const movements = await inventoryService.findMovements(req.query);

    res.status(200).json({
      data: movements,
    });
  } catch (error) {
    next(error);
  }
}

async function adjustInventory(req, res, next) {
  const errors = validateInventoryAdjustmentPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const adjustment = await inventoryService.adjustStock(req.user, req.body);

    res.status(200).json({
      data: adjustment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { adjustInventory, listInventory, listInventoryMovements };
