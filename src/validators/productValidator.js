const VALID_PRODUCT_STATUSES = new Set(['active', 'inactive', 'discontinued']);

function isBlank(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isNonNegativeInteger(value) {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized >= 0;
}

function validateProductId(id) {
  if (!isPositiveInteger(id)) {
    return ['Product ID must be a positive integer.'];
  }

  return [];
}

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

function validateProductImagePayload(image, index) {
  const errors = [];
  const prefix = `Product image ${index + 1}`;

  if (!isPlainObject(image)) {
    return [`${prefix} must be an object.`];
  }

  const imageUrl = image.imageUrl ?? image.image_url;
  const altText = image.altText ?? image.alt_text;
  const displayOrder = image.displayOrder ?? image.display_order;
  const isPrimary = image.isPrimary ?? image.is_primary;

  if (typeof imageUrl !== 'string' || isBlank(imageUrl)) {
    errors.push(`${prefix} URL is required.`);
  }

  if (altText !== undefined && altText !== null && typeof altText !== 'string') {
    errors.push(`${prefix} alt text must be a string.`);
  }

  if (displayOrder !== undefined && !isNonNegativeInteger(displayOrder)) {
    errors.push(`${prefix} display order must be a non-negative integer.`);
  }

  if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
    errors.push(`${prefix} primary flag must be true or false.`);
  }

  return errors;
}

function validateProductVariantPayload(variant, index) {
  const errors = [];
  const prefix = `Product variant ${index + 1}`;

  if (!isPlainObject(variant)) {
    return [`${prefix} must be an object.`];
  }

  const costPrice = variant.costPrice ?? variant.cost_price;
  const sellingPrice = variant.sellingPrice ?? variant.selling_price ?? variant.price;
  const stockQuantity = variant.stockQuantity ?? variant.stock_quantity;
  const reorderLevel = variant.reorderLevel ?? variant.reorder_level;

  if (typeof variant.name !== 'string' || isBlank(variant.name)) {
    errors.push(`${prefix} name is required.`);
  }

  if (typeof variant.sku !== 'string' || isBlank(variant.sku)) {
    errors.push(`${prefix} SKU is required.`);
  }

  if (variant.barcode !== undefined && variant.barcode !== null && typeof variant.barcode !== 'string') {
    errors.push(`${prefix} barcode must be a string.`);
  }

  if (variant.attributes !== undefined && !isPlainObject(variant.attributes)) {
    errors.push(`${prefix} attributes must be an object.`);
  }

  if (variant.options !== undefined && !isPlainObject(variant.options)) {
    errors.push(`${prefix} options must be an object.`);
  }

  if (costPrice !== undefined && !isNonNegativeNumber(costPrice)) {
    errors.push(`${prefix} cost price cannot be negative.`);
  }

  if (sellingPrice !== undefined && !isNonNegativeNumber(sellingPrice)) {
    errors.push(`${prefix} selling price cannot be negative.`);
  }

  if (stockQuantity !== undefined && !isNonNegativeInteger(stockQuantity)) {
    errors.push(`${prefix} stock quantity must be a non-negative integer.`);
  }

  if (reorderLevel !== undefined && !isNonNegativeInteger(reorderLevel)) {
    errors.push(`${prefix} reorder level must be a non-negative integer.`);
  }

  if (variant.status !== undefined && !VALID_PRODUCT_STATUSES.has(variant.status)) {
    errors.push(`${prefix} status must be active, inactive, or discontinued.`);
  }

  return errors;
}

function validateUpdateProductPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return ['Product details are required.'];
  }

  if (typeof payload.name !== 'string' || isBlank(payload.name)) {
    errors.push('Product name is required.');
  }

  if (typeof payload.sku !== 'string' || isBlank(payload.sku)) {
    errors.push('Product SKU is required.');
  }

  if (payload.barcode !== undefined && payload.barcode !== null && typeof payload.barcode !== 'string') {
    errors.push('Product barcode must be a string.');
  }

  if (
    payload.description !== undefined &&
    payload.description !== null &&
    typeof payload.description !== 'string'
  ) {
    errors.push('Product description must be a string.');
  }

  if (payload.categoryId !== undefined && payload.categoryId !== null && !isPositiveInteger(payload.categoryId)) {
    errors.push('Product category ID must be a positive integer.');
  }

  if (payload.category_id !== undefined && payload.category_id !== null && !isPositiveInteger(payload.category_id)) {
    errors.push('Product category ID must be a positive integer.');
  }

  if (payload.brandId !== undefined && payload.brandId !== null && !isPositiveInteger(payload.brandId)) {
    errors.push('Product brand ID must be a positive integer.');
  }

  if (payload.brand_id !== undefined && payload.brand_id !== null && !isPositiveInteger(payload.brand_id)) {
    errors.push('Product brand ID must be a positive integer.');
  }

  if (payload.supplierId !== undefined && payload.supplierId !== null && !isPositiveInteger(payload.supplierId)) {
    errors.push('Product supplier ID must be a positive integer.');
  }

  if (payload.supplier_id !== undefined && payload.supplier_id !== null && !isPositiveInteger(payload.supplier_id)) {
    errors.push('Product supplier ID must be a positive integer.');
  }

  const costPrice = payload.costPrice ?? payload.cost_price;
  const sellingPrice = payload.sellingPrice ?? payload.selling_price ?? payload.price;
  const taxRate = payload.taxRate ?? payload.tax_rate;
  const reorderLevel = payload.reorderLevel ?? payload.reorder_level;

  if (costPrice !== undefined && !isNonNegativeNumber(costPrice)) {
    errors.push('Product cost price cannot be negative.');
  }

  if (sellingPrice !== undefined && !isNonNegativeNumber(sellingPrice)) {
    errors.push('Product selling price cannot be negative.');
  }

  if (taxRate !== undefined && !isNonNegativeNumber(taxRate)) {
    errors.push('Product tax rate cannot be negative.');
  }

  if (reorderLevel !== undefined && !isNonNegativeInteger(reorderLevel)) {
    errors.push('Product reorder level must be a non-negative integer.');
  }

  if (payload.status !== undefined && !VALID_PRODUCT_STATUSES.has(payload.status)) {
    errors.push('Product status must be active, inactive, or discontinued.');
  }

  if (payload.variants !== undefined) {
    if (!Array.isArray(payload.variants)) {
      errors.push('Product variants must be an array.');
    } else {
      payload.variants.forEach((variant, index) => {
        errors.push(...validateProductVariantPayload(variant, index));
      });
    }
  }

  if (payload.images !== undefined) {
    if (!Array.isArray(payload.images)) {
      errors.push('Product images must be an array.');
    } else {
      const primaryImageCount = payload.images.filter(
        (image) => image && (image.isPrimary ?? image.is_primary) === true
      ).length;

      if (primaryImageCount > 1) {
        errors.push('Only one product image can be primary.');
      }

      payload.images.forEach((image, index) => {
        errors.push(...validateProductImagePayload(image, index));
      });
    }
  }

  return errors;
}

module.exports = {
  validateProductId,
  validateProductPayload,
  validateUpdateProductPayload,
};
