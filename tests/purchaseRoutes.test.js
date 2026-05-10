const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('purchase routes register POST / and PUT /:id/approve', {
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

  assert.equal(hasCreateRoute, true);
  assert.equal(hasApproveRoute, true);
});
