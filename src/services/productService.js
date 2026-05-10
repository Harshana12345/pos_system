const database = require('../config/database');
const Product = require('../models/Product');
const HttpError = require('../utils/httpError');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value);
}

function normalizeNullableDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function mapProductImageRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    displayOrder: row.display_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProductVariantRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    attributes: row.attributes,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    stockQuantity: row.stock_quantity,
    reorderLevel: row.reorder_level,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProductRow(row, { variants = [], images = [] } = {}) {
  return new Product({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    categoryId: row.category_id,
    brandId: row.brand_id,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    taxRate: row.tax_rate,
    reorderLevel: row.reorder_level,
    status: row.status,
    expiryDate: row.expiry_date,
    supplierId: row.supplier_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    variants,
    images,
  });
}

async function findImagesByProductId(client, productId) {
  const result = await client.query(
    `SELECT id,
            product_id,
            image_url,
            alt_text,
            display_order,
            is_primary,
            created_at,
            updated_at
     FROM product_images
     WHERE product_id = $1
     ORDER BY display_order ASC, id ASC`,
    [Number(productId)]
  );

  return result.rows.map(mapProductImageRow);
}

async function findVariantsByProductId(client, productId) {
  const result = await client.query(
    `SELECT id,
            product_id,
            name,
            sku,
            barcode,
            attributes,
            cost_price,
            selling_price,
            stock_quantity,
            reorder_level,
            status,
            created_at,
            updated_at
     FROM product_variants
     WHERE product_id = $1
     ORDER BY id ASC`,
    [Number(productId)]
  );

  return result.rows.map(mapProductVariantRow);
}

async function findProductDetailsById(client, productId) {
  const result = await client.query(
    `SELECT id,
            name,
            sku,
            barcode,
            description,
            category_id,
            brand_id,
            cost_price,
            selling_price,
            tax_rate,
            reorder_level,
            status,
            expiry_date,
            supplier_id,
            created_at,
            updated_at,
            deleted_at
     FROM products
     WHERE id = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [Number(productId)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Product not found.');
  }

  const variants = await findVariantsByProductId(client, productId);
  const images = await findImagesByProductId(client, productId);

  return mapProductRow(result.rows[0], { variants, images });
}

async function findAll() {
  const result = await database.query(
    `SELECT id,
            name,
            sku,
            barcode,
            description,
            category_id,
            brand_id,
            cost_price,
            selling_price,
            tax_rate,
            reorder_level,
            status,
            expiry_date,
            supplier_id,
            created_at,
            updated_at,
            deleted_at
     FROM products
     WHERE deleted_at IS NULL
     ORDER BY id ASC`
  );

  return result.rows.map((row) => mapProductRow(row));
}

async function findById(id) {
  return findProductDetailsById(database, id);
}

async function replaceProductVariants(client, productId, variants) {
  await client.query('DELETE FROM product_variants WHERE product_id = $1', [Number(productId)]);

  for (const variant of variants) {
    await client.query(
      `INSERT INTO product_variants (
         product_id,
         name,
         sku,
         barcode,
         attributes,
         cost_price,
         selling_price,
         stock_quantity,
         reorder_level,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        Number(productId),
        variant.name.trim(),
        variant.sku.trim(),
        normalizeNullableString(variant.barcode),
        variant.attributes ?? variant.options ?? {},
        Number(variant.costPrice ?? variant.cost_price ?? 0),
        Number(variant.sellingPrice ?? variant.selling_price ?? variant.price ?? 0),
        Number(variant.stockQuantity ?? variant.stock_quantity ?? 0),
        Number(variant.reorderLevel ?? variant.reorder_level ?? 0),
        variant.status || 'active',
      ]
    );
  }
}

async function replaceProductImages(client, productId, images) {
  await client.query('DELETE FROM product_images WHERE product_id = $1', [Number(productId)]);

  for (const [index, image] of images.entries()) {
    await client.query(
      `INSERT INTO product_images (
         product_id,
         image_url,
         alt_text,
         display_order,
         is_primary
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        Number(productId),
        (image.imageUrl ?? image.image_url).trim(),
        normalizeNullableString(image.altText ?? image.alt_text),
        Number(image.displayOrder ?? image.display_order ?? index),
        Boolean(image.isPrimary ?? image.is_primary ?? false),
      ]
    );
  }
}

async function updateProduct(
  id,
  {
    name,
    sku,
    barcode,
    description,
    categoryId,
    category_id,
    brandId,
    brand_id,
    costPrice,
    cost_price,
    sellingPrice,
    selling_price,
    price,
    taxRate,
    tax_rate,
    reorderLevel,
    reorder_level,
    status,
    expiryDate,
    expiry_date,
    supplierId,
    supplier_id,
    variants,
    images,
  }
) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `UPDATE products
       SET name = $2,
           sku = $3,
           barcode = $4,
           description = $5,
           category_id = $6,
           brand_id = $7,
           cost_price = $8,
           selling_price = $9,
           tax_rate = $10,
           reorder_level = $11,
           status = $12,
           expiry_date = $13,
           supplier_id = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id,
                 name,
                 sku,
                 barcode,
                 description,
                 category_id,
                 brand_id,
                 cost_price,
                 selling_price,
                 tax_rate,
                 reorder_level,
                 status,
                 expiry_date,
                 supplier_id,
                 created_at,
                 updated_at,
                 deleted_at`,
      [
        Number(id),
        name.trim(),
        sku.trim(),
        normalizeNullableString(barcode),
        normalizeNullableString(description),
        normalizeNullableInteger(categoryId ?? category_id),
        normalizeNullableInteger(brandId ?? brand_id),
        Number(costPrice ?? cost_price ?? 0),
        Number(sellingPrice ?? selling_price ?? price ?? 0),
        Number(taxRate ?? tax_rate ?? 0),
        Number(reorderLevel ?? reorder_level ?? 0),
        status || 'active',
        normalizeNullableDate(expiryDate ?? expiry_date),
        normalizeNullableInteger(supplierId ?? supplier_id),
      ]
    );

    if (productResult.rowCount === 0) {
      throw new HttpError(404, 'Product not found.');
    }

    if (variants !== undefined) {
      await replaceProductVariants(client, id, variants);
    }

    if (images !== undefined) {
      await replaceProductImages(client, id, images);
    }

    const product = await findProductDetailsById(client, id);

    await client.query('COMMIT');

    return product;
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new HttpError(409, 'Product SKU, barcode, variant SKU, or image URL already exists.');
    }

    if (error.code === '23503') {
      throw new HttpError(400, 'Product category, brand, or supplier reference is invalid.');
    }

    throw error;
  } finally {
    client.release();
  }
}

async function deleteProduct(id) {
  const result = await database.query(
    `UPDATE products
     SET deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Product not found.');
  }
}

module.exports = {
  deleteProduct,
  findAll,
  findById,
  mapProductImageRow,
  mapProductRow,
  mapProductVariantRow,
  updateProduct,
};
