const database = require('../config/database');
const InventoryItem = require('../models/InventoryItem');

function mapInventoryRow(row) {
  const reorderLevel = Number(row.reorder_level);
  const quantity = Number(row.quantity);

  return new InventoryItem({
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    branchId: row.branch_id,
    quantity,
    reorderLevel,
    lowStockAlert: quantity <= reorderLevel,
    lastUpdated: row.last_updated,
    product: {
      id: row.product_id,
      name: row.product_name,
      sku: row.product_sku,
      barcode: row.product_barcode,
      status: row.product_status,
    },
    variant: row.variant_id
      ? {
          id: row.variant_id,
          name: row.variant_name,
          sku: row.variant_sku,
          barcode: row.variant_barcode,
          status: row.variant_status,
        }
      : null,
    branch: {
      id: row.branch_id,
      name: row.branch_name,
      status: row.branch_status,
    },
  });
}

function normalizeBranchId(filters = {}) {
  const branchId = filters.branchId ?? filters.branch_id;

  return branchId === undefined ? null : Number(branchId);
}

async function findAll(filters = {}) {
  const branchId = normalizeBranchId(filters);
  const params = [];
  const where = ['products.deleted_at IS NULL', 'branches.deleted_at IS NULL'];

  if (branchId !== null) {
    params.push(branchId);
    where.push(`inventory.branch_id = $${params.length}`);
  }

  const result = await database.query(
    `SELECT inventory.id,
            inventory.product_id,
            inventory.variant_id,
            inventory.branch_id,
            inventory.quantity,
            inventory.last_updated,
            COALESCE(product_variants.reorder_level, products.reorder_level) AS reorder_level,
            products.name AS product_name,
            products.sku AS product_sku,
            products.barcode AS product_barcode,
            products.status AS product_status,
            product_variants.name AS variant_name,
            product_variants.sku AS variant_sku,
            product_variants.barcode AS variant_barcode,
            product_variants.status AS variant_status,
            branches.name AS branch_name,
            branches.status AS branch_status
     FROM inventory
     INNER JOIN products
       ON products.id = inventory.product_id
     LEFT JOIN product_variants
       ON product_variants.id = inventory.variant_id
     INNER JOIN branches
       ON branches.id = inventory.branch_id
     WHERE ${where.join(' AND ')}
     ORDER BY branches.id ASC, products.name ASC, product_variants.name ASC, inventory.id ASC`,
    params
  );

  return result.rows.map(mapInventoryRow);
}

module.exports = { findAll, mapInventoryRow };
