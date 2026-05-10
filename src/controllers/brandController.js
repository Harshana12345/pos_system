const brandService = require('../services/brandService');
const HttpError = require('../utils/httpError');
const {
  validateBrandId,
  validateBrandPayload,
} = require('../validators/brandValidator');

async function listBrands(_req, res, next) {
  try {
    const brands = await brandService.findAll();

    res.status(200).json({
      data: brands,
    });
  } catch (error) {
    next(error);
  }
}

async function createBrand(req, res, next) {
  const errors = validateBrandPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const brand = await brandService.createBrand(req.body);

    res.status(201).json({
      data: brand,
    });
  } catch (error) {
    next(error);
  }
}

async function updateBrand(req, res, next) {
  const errors = [
    ...validateBrandId(req.params.id),
    ...validateBrandPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);

    res.status(200).json({
      data: brand,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBrand(req, res, next) {
  const errors = validateBrandId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await brandService.deleteBrand(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
};
