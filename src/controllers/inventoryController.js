const inventoryService = require('../services/inventoryService');
const HttpError = require('../utils/httpError');
const { validateInventoryFilters } = require('../validators/inventoryValidator');

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

module.exports = { listInventory };
