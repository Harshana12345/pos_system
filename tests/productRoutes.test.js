const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('product routes register GET /:id', {
  skip: !dependenciesAvailable,
}, () => {
  const productRoutes = require('../src/routes/productRoutes');
  const hasGetProductRoute = productRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.get === true
  );

  assert.equal(hasGetProductRoute, true);
});

test('product routes register GET /barcode/:code before GET /:id', {
  skip: !dependenciesAvailable,
}, () => {
  const productRoutes = require('../src/routes/productRoutes');
  const barcodeRouteIndex = productRoutes.stack.findIndex(
    (layer) => layer.route?.path === '/barcode/:code' && layer.route.methods.get === true
  );
  const idRouteIndex = productRoutes.stack.findIndex(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.get === true
  );

  assert.notEqual(barcodeRouteIndex, -1);
  assert.notEqual(idRouteIndex, -1);
  assert.equal(barcodeRouteIndex < idRouteIndex, true);
});
