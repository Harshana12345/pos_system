const productService = require('../services/productService');

function listProducts(_req, res) {
  res.json({
    data: productService.findAll(),
  });
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

module.exports = { listProducts, uploadProductImages };
