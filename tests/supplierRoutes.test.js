const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('supplier routes register CRUD endpoints', {
  skip: !dependenciesAvailable,
}, () => {
  const supplierRoutes = require('../src/routes/supplierRoutes');

  const hasListRoute = supplierRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.get === true
  );
  const hasCreateRoute = supplierRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );
  const hasUpdateRoute = supplierRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.put === true
  );
  const hasDeleteRoute = supplierRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.delete === true
  );

  assert.equal(hasListRoute, true);
  assert.equal(hasCreateRoute, true);
  assert.equal(hasUpdateRoute, true);
  assert.equal(hasDeleteRoute, true);
});
