function validateProductPayload(payload) {
  const errors = [];

  if (!payload.name) {
    errors.push('Product name is required.');
  }

  if (!payload.sku) {
    errors.push('Product SKU is required.');
  }

  if (payload.price !== undefined && Number(payload.price) < 0) {
    errors.push('Product price cannot be negative.');
  }

  return errors;
}

module.exports = { validateProductPayload };

