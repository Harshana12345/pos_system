const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('category routes register CRUD endpoints', {
  skip: !dependenciesAvailable,
}, () => {
  const categoryRoutes = require('../src/routes/categoryRoutes');

  const hasListRoute = categoryRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.get === true
  );
  const hasCreateRoute = categoryRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );
  const hasUpdateRoute = categoryRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.put === true
  );
  const hasDeleteRoute = categoryRoutes.stack.some(
    (layer) => layer.route?.path === '/:id' && layer.route.methods.delete === true
  );

  assert.equal(hasListRoute, true);
  assert.equal(hasCreateRoute, true);
  assert.equal(hasUpdateRoute, true);
  assert.equal(hasDeleteRoute, true);
});
