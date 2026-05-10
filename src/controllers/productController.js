const productService = require('../services/productService');

function listProducts(_req, res) {
  res.json({
    data: productService.findAll(),
  });
}

module.exports = { listProducts };

