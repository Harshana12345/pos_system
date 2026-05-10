const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('sale routes register sales endpoints', {
  skip: !dependenciesAvailable,
}, () => {
  const saleRoutes = require('../src/routes/saleRoutes');

  const hasListRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.get === true
  );
  const hasDetailRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.get === true
  );
  const hasCreateRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );
  const hasRefundRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/refund' && layer.route.methods.post === true
  );
  const hasResumeRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/resume' && layer.route.methods.post === true
  );
  const hasSuspendRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/suspend' && layer.route.methods.post === true
  );

  assert.equal(hasListRoute, true);
  assert.equal(hasDetailRoute, true);
  assert.equal(hasCreateRoute, true);
  assert.equal(hasRefundRoute, true);
  assert.equal(hasResumeRoute, true);
  assert.equal(hasSuspendRoute, true);
});
