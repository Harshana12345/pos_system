const Product = require('../models/Product');

const products = [
  new Product({
    id: 'sample-product-1',
    name: 'Sample Product',
    sku: 'SAMPLE-001',
    price: 0,
    stockQuantity: 0,
  }),
];

function findAll() {
  return products;
}

module.exports = { findAll };

