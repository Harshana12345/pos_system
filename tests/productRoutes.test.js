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
