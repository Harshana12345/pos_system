const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('purchase routes register POST /', {
  skip: !dependenciesAvailable,
}, () => {
  const purchaseRoutes = require('../src/routes/purchaseRoutes');

  const hasCreateRoute = purchaseRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );

  assert.equal(hasCreateRoute, true);
});
