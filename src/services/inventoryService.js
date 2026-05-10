const database = require('../config/database');
const { env } = require('../config/env');
const InventoryItem = require('../models/InventoryItem');
const HttpError = require('../utils/httpError');

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
      ...(row.product_expiry_date !== undefined
        ? {
            expiryDate: row.product_expiry_date,
            daysUntilExpiry: Number(row.days_until_expiry),
          }
        : {}),
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

function normalizeMovementFilters(filters = {}) {
  return {
    inventoryId: filters.inventoryId ?? filters.inventory_id,
    productId: filters.productId ?? filters.product_id,
    variantId: filters.variantId ?? filters.variant_id,
    branchId: filters.branchId ?? filters.branch_id,
    adjustedByUserId: filters.adjustedByUserId ?? filters.adjusted_by_user_id,
    createdFrom: filters.createdFrom ?? filters.created_from ?? filters.dateFrom ?? filters.date_from,
    createdTo: filters.createdTo ?? filters.created_to ?? filters.dateTo ?? filters.date_to,
    limit: filters.limit,
    offset: filters.offset,
  };
}

function normalizeExpiringFilters(filters = {}) {
  const thresholdDays = filters.thresholdDays ?? filters.threshold_days;

  return {
    branchId: normalizeBranchId(filters),
    thresholdDays:
      thresholdDays === undefined ? env.inventory.expiringThresholdDays : Number(thresholdDays),
  };
}

async function findInventory(filters = {}, options = {}) {
  const expiringFilters =
    options.expiringOnly === true ? normalizeExpiringFilters(filters) : null;
  const branchId = expiringFilters?.branchId ?? normalizeBranchId(filters);
  const params = [];
  const where = ['products.deleted_at IS NULL', 'branches.deleted_at IS NULL'];

  if (branchId !== null) {
    params.push(branchId);
    where.push(`inventory.branch_id = $${params.length}`);
  }

  if (options.lowStockOnly === true) {
    where.push('inventory.quantity < COALESCE(product_variants.reorder_level, products.reorder_level)');
  }

  if (options.outOfStockOnly === true) {
    where.push('inventory.quantity = 0');
  }

  if (options.expiringOnly === true) {
    params.push(expiringFilters.thresholdDays);
    where.push('products.expiry_date IS NOT NULL');
    where.push('products.expiry_date >= CURRENT_DATE');
    where.push(`products.expiry_date <= CURRENT_DATE + ($${params.length}::integer * INTERVAL '1 day')`);
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
            ${
              options.expiringOnly === true
                ? 'products.expiry_date AS product_expiry_date, products.expiry_date - CURRENT_DATE AS days_until_expiry,'
                : ''
            }
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

async function findAll(filters = {}) {
  return findInventory(filters);
}

async function findLowStock(filters = {}) {
  return findInventory(filters, { lowStockOnly: true });
}

async function findOutOfStock(filters = {}) {
  return findInventory(filters, { outOfStockOnly: true });
}

async function findExpiring(filters = {}) {
  return findInventory(filters, { expiringOnly: true });
}

function normalizeAdjustmentPayload(payload) {
  const quantity = payload.quantity;
  const quantityChange = payload.quantityChange ?? payload.quantity_change ?? payload.adjustment;

  return {
    inventoryId: Number(payload.inventoryId ?? payload.inventory_id),
    quantity: quantity === undefined ? undefined : Number(quantity),
    quantityChange: quantityChange === undefined ? undefined : Number(quantityChange),
    reason: payload.reason.trim(),
  };
}

function mapAdjustmentRow(row) {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    productId: row.product_id,
    variantId: row.variant_id,
    branchId: row.branch_id,
    previousQuantity: Number(row.previous_quantity),
    newQuantity: Number(row.new_quantity),
    quantityChange: Number(row.quantity_change),
    reason: row.reason,
    adjustedByUserId: row.adjusted_by_user_id,
    createdAt: row.created_at,
  };
}

function mapMovementRow(row) {
  return {
    ...mapAdjustmentRow(row),
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
    adjustedBy: row.adjusted_by_user_id
      ? {
          id: row.adjusted_by_user_id,
          name: row.adjusted_by_user_name,
          email: row.adjusted_by_user_email,
        }
      : null,
  };
}

function mapValuationRow(row) {
  return {
    branchId: row.branch_id,
    totalQuantity: Number(row.total_quantity),
    totalStockValue: Number(row.total_stock_value),
    branch: {
      id: row.branch_id,
      name: row.branch_name,
      status: row.branch_status,
    },
  };
}

async function findValuation(filters = {}) {
  const branchId = normalizeBranchId(filters);
  const params = [];
  const where = ['branches.deleted_at IS NULL'];

  if (branchId !== null) {
    params.push(branchId);
    where.push(`branches.id = $${params.length}`);
  }

  const result = await database.query(
    `SELECT branches.id AS branch_id,
            branches.name AS branch_name,
            branches.status AS branch_status,
            COALESCE(
              SUM(
                CASE
                  WHEN products.id IS NULL THEN 0
                  ELSE inventory.quantity
                END
              ),
              0
            )::integer AS total_quantity,
            COALESCE(
              SUM(
                CASE
                  WHEN products.id IS NULL THEN 0
                  ELSE inventory.quantity * COALESCE(product_variants.cost_price, products.cost_price)
                END
              ),
              0
            )::numeric(12, 2) AS total_stock_value
     FROM branches
     LEFT JOIN inventory
       ON inventory.branch_id = branches.id
     LEFT JOIN products
       ON products.id = inventory.product_id
      AND products.deleted_at IS NULL
     LEFT JOIN product_variants
       ON product_variants.id = inventory.variant_id
     WHERE ${where.join(' AND ')}
     GROUP BY branches.id, branches.name, branches.status
     ORDER BY branches.id ASC`,
    params
  );

  return result.rows.map(mapValuationRow);
}

async function findMovements(filters = {}) {
  const normalizedFilters = normalizeMovementFilters(filters);
  const params = [];
  const where = [];

  [
    ['inventoryId', 'inventory_adjustments.inventory_id'],
    ['productId', 'inventory_adjustments.product_id'],
    ['variantId', 'inventory_adjustments.variant_id'],
    ['branchId', 'inventory_adjustments.branch_id'],
    ['adjustedByUserId', 'inventory_adjustments.adjusted_by_user_id'],
  ].forEach(([filterKey, columnName]) => {
    if (normalizedFilters[filterKey] !== undefined) {
      params.push(Number(normalizedFilters[filterKey]));
      where.push(`${columnName} = $${params.length}`);
    }
  });

  if (normalizedFilters.createdFrom !== undefined) {
    params.push(normalizedFilters.createdFrom);
    where.push(`inventory_adjustments.created_at >= $${params.length}`);
  }

  if (normalizedFilters.createdTo !== undefined) {
    params.push(normalizedFilters.createdTo);
    where.push(`inventory_adjustments.created_at <= $${params.length}`);
  }

  let paginationSql = '';

  if (normalizedFilters.limit !== undefined) {
    params.push(Number(normalizedFilters.limit));
    paginationSql += ` LIMIT $${params.length}`;
  }

  if (normalizedFilters.offset !== undefined) {
    params.push(Number(normalizedFilters.offset));
    paginationSql += ` OFFSET $${params.length}`;
  }

  const result = await database.query(
    `SELECT inventory_adjustments.id,
            inventory_adjustments.inventory_id,
            inventory_adjustments.product_id,
            inventory_adjustments.variant_id,
            inventory_adjustments.branch_id,
            inventory_adjustments.previous_quantity,
            inventory_adjustments.new_quantity,
            inventory_adjustments.quantity_change,
            inventory_adjustments.reason,
            inventory_adjustments.adjusted_by_user_id,
            inventory_adjustments.created_at,
            products.name AS product_name,
            products.sku AS product_sku,
            products.barcode AS product_barcode,
            products.status AS product_status,
            product_variants.name AS variant_name,
            product_variants.sku AS variant_sku,
            product_variants.barcode AS variant_barcode,
            product_variants.status AS variant_status,
            branches.name AS branch_name,
            branches.status AS branch_status,
            users.name AS adjusted_by_user_name,
            users.email AS adjusted_by_user_email
     FROM inventory_adjustments
     INNER JOIN products
       ON products.id = inventory_adjustments.product_id
     LEFT JOIN product_variants
       ON product_variants.id = inventory_adjustments.variant_id
     INNER JOIN branches
       ON branches.id = inventory_adjustments.branch_id
     LEFT JOIN users
       ON users.id = inventory_adjustments.adjusted_by_user_id
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY inventory_adjustments.created_at DESC, inventory_adjustments.id DESC${paginationSql}`,
    params
  );

  return result.rows.map(mapMovementRow);
}

async function adjustStock(requester, payload) {
  const { inventoryId, quantity, quantityChange, reason } = normalizeAdjustmentPayload(payload);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const inventoryResult = await client.query(
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
       WHERE inventory.id = $1
         AND products.deleted_at IS NULL
         AND branches.deleted_at IS NULL
       FOR UPDATE OF inventory`,
      [inventoryId]
    );

    if (inventoryResult.rowCount === 0) {
      throw new HttpError(404, 'Inventory item not found.');
    }

    const currentQuantity = Number(inventoryResult.rows[0].quantity);
    const newQuantity = quantity === undefined ? currentQuantity + quantityChange : quantity;

    if (newQuantity < 0) {
      throw new HttpError(400, 'Stock quantity cannot be negative.');
    }

    const updateResult = await client.query(
      `UPDATE inventory
       SET quantity = $2,
           last_updated = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING last_updated`,
      [inventoryId, newQuantity]
    );

    const adjustmentResult = await client.query(
      `INSERT INTO inventory_adjustments (
         inventory_id,
         product_id,
         variant_id,
         branch_id,
         previous_quantity,
         new_quantity,
         quantity_change,
         reason,
         adjusted_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id,
                 inventory_id,
                 product_id,
                 variant_id,
                 branch_id,
                 previous_quantity,
                 new_quantity,
                 quantity_change,
                 reason,
                 adjusted_by_user_id,
                 created_at`,
      [
        inventoryId,
        inventoryResult.rows[0].product_id,
        inventoryResult.rows[0].variant_id,
        inventoryResult.rows[0].branch_id,
        currentQuantity,
        newQuantity,
        newQuantity - currentQuantity,
        reason,
        requester?.id ?? null,
      ]
    );

    const inventory = mapInventoryRow({
      ...inventoryResult.rows[0],
      quantity: newQuantity,
      last_updated: updateResult.rows[0].last_updated,
    });
    const adjustment = mapAdjustmentRow(adjustmentResult.rows[0]);

    await client.query('COMMIT');

    return { inventory, adjustment };
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  adjustStock,
  findAll,
  findExpiring,
  findLowStock,
  findOutOfStock,
  findValuation,
  findMovements,
  mapAdjustmentRow,
  mapInventoryRow,
  mapMovementRow,
  mapValuationRow,
};
