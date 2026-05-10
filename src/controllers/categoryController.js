const categoryService = require('../services/categoryService');
const HttpError = require('../utils/httpError');
const {
  validateCategoryId,
  validateCategoryPayload,
} = require('../validators/categoryValidator');

async function listCategories(_req, res, next) {
  try {
    const categories = await categoryService.findAll();

    res.status(200).json({
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  const errors = validateCategoryPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  const errors = [
    ...validateCategoryId(req.params.id),
    ...validateCategoryPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    res.status(200).json({
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  const errors = validateCategoryId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await categoryService.deleteCategory(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
};
