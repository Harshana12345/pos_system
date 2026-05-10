const productService = require('../services/productService');
const HttpError = require('../utils/httpError');
const {
  validateProductId,
  validateUpdateProductPayload,
} = require('../validators/productValidator');

async function listProducts(_req, res, next) {
  try {
    const products = await productService.findAll();

    res.json({
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  const errors = [
    ...validateProductId(req.params.id),
    ...validateUpdateProductPayload(req.body),
  ];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  const errors = validateProductId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await productService.deleteProduct(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

function uploadProductImages(req, res) {
  const files = req.files || [];

  res.status(201).json({
    data: files.map((file) => ({
      fieldName: file.fieldname,
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    })),
  });
}

module.exports = { deleteProduct, listProducts, updateProduct, uploadProductImages };
