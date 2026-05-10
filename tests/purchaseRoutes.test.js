const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('purchase routes register create, approve, and receive endpoints', {
  skip: !dependenciesAvailable,
}, () => {
  const purchaseRoutes = require('../src/routes/purchaseRoutes');

  const hasCreateRoute = purchaseRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );
  const hasApproveRoute = purchaseRoutes.stack.some(
    (layer) =>
      layer.route?.path === '/:id/approve' && layer.route.methods.put === true
  );
  const hasReceiveRoute = purchaseRoutes.stack.some(
    (layer) =>
      layer.route?.path === '/:id/receive' && layer.route.methods.post === true
  );

  assert.equal(hasCreateRoute, true);
  assert.equal(hasApproveRoute, true);
  assert.equal(hasReceiveRoute, true);
});
