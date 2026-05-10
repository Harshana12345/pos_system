const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('inventory routes register GET /', {
  skip: !dependenciesAvailable,
}, () => {
  const inventoryRoutes = require('../src/routes/inventoryRoutes');
  const hasListInventoryRoute = inventoryRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.get === true
  );

  assert.equal(hasListInventoryRoute, true);
});
