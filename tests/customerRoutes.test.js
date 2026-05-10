const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('customer routes register CRUD endpoints', {
  skip: !dependenciesAvailable,
}, () => {
  const customerRoutes = require('../src/routes/customerRoutes');

  const hasListRoute = customerRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.get === true
  );
  const hasGetRoute = customerRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.get === true
  );
  const hasCreateRoute = customerRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );
  const hasUpdateRoute = customerRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.put === true
  );
  const hasDeleteRoute = customerRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.delete === true
  );
  const hasPurchaseHistoryRoute = customerRoutes.stack.some(
    (layer) =>
      layer.route?.path === '/:id/purchase-history' &&
      layer.route.methods.get === true
  );
  const hasLoyaltyPointsRoute = customerRoutes.stack.some(
    (layer) =>
      layer.route?.path === '/:id/loyalty-points' &&
      layer.route.methods.post === true
  );

  assert.equal(hasListRoute, true);
  assert.equal(hasGetRoute, true);
  assert.equal(hasCreateRoute, true);
  assert.equal(hasUpdateRoute, true);
  assert.equal(hasDeleteRoute, true);
  assert.equal(hasPurchaseHistoryRoute, true);
  assert.equal(hasLoyaltyPointsRoute, true);
});
