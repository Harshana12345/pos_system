const assert = require('node:assert');
const test = require('node:test');

let dependenciesAvailable = true;

try {
  require.resolve('express');
} catch {
  dependenciesAvailable = false;
}

test('sale routes register POST /', {
  skip: !dependenciesAvailable,
}, () => {
  const saleRoutes = require('../src/routes/saleRoutes');

  const hasCreateRoute = saleRoutes.stack.some(
    (layer) => layer.route?.path === '/' && layer.route.methods.post === true
  );

  assert.equal(hasCreateRoute, true);
});
