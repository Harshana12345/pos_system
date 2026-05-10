const database = require('../config/database');
const HttpError = require('../utils/httpError');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePurchasePayload(payload) {
  const items = payload.items.map((item) => {
    const quantity = Number(item.quantity);
    const costPrice = Number(item.costPrice ?? item.cost_price);

    return {
      productId: Number(item.productId ?? item.product_id),
      quantity,
      costPrice,
      lineTotal: roundCurrency(quantity * costPrice),
    };
  });

  return {
    supplierId: Number(payload.supplierId ?? payload.supplier_id),
    branchId: Number(payload.branchId ?? payload.branch_id),
    status: payload.status || 'draft',
    notes: normalizeNullableString(payload.notes),
    items,
    totalAmount: roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0)),
  };
}

function mapPurchaseItemRow(row) {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    costPrice: Number(row.cost_price),
    lineTotal: roundCurrency(Number(row.quantity) * Number(row.cost_price)),
  };
}

function mapPurchaseOrderRow(row, items = []) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    branchId: row.branch_id,
    status: row.status,
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items,
  };
}

function mapForeignKeyError(error) {
  if (error.code !== '23503') {
    return error;
  }

  if (error.constraint?.includes('supplier')) {
    return new HttpError(404, 'Supplier not found.');
  }

  if (error.constraint?.includes('branch')) {
    return new HttpError(404, 'Branch not found.');
  }

  if (error.constraint?.includes('product')) {
    return new HttpError(404, 'Product not found.');
  }

  return new HttpError(400, 'Purchase order references an invalid record.');
}

async function findPurchaseItemsByOrderId(client, purchaseOrderId) {
  const itemResult = await client.query(
    `SELECT id,
            purchase_order_id,
            product_id,
            quantity,
            cost_price
     FROM purchase_order_items
     WHERE purchase_order_id = $1
     ORDER BY id ASC`,
    [purchaseOrderId]
  );

  return itemResult.rows.map(mapPurchaseItemRow);
}

async function createPurchaseOrder(requester, payload) {
  const normalized = normalizePurchasePayload(payload);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO purchase_orders (
         supplier_id,
         branch_id,
         status,
         total_amount,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 supplier_id,
                 branch_id,
                 status,
                 total_amount,
                 notes,
                 created_by,
                 created_at`,
      [
        normalized.supplierId,
        normalized.branchId,
        normalized.status,
        normalized.totalAmount,
        normalized.notes,
        requester?.id ?? null,
      ]
    );

    const itemValues = [];
    const itemPlaceholders = normalized.items.map((item, index) => {
      const offset = index * 4;

      itemValues.push(
        orderResult.rows[0].id,
        item.productId,
        item.quantity,
        item.costPrice
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    });

    const itemResult = await client.query(
      `INSERT INTO purchase_order_items (
         purchase_order_id,
         product_id,
         quantity,
         cost_price
       )
       VALUES ${itemPlaceholders.join(', ')}
       RETURNING id,
                 purchase_order_id,
                 product_id,
                 quantity,
                 cost_price`,
      itemValues
    );

    await client.query('COMMIT');

    return mapPurchaseOrderRow(
      orderResult.rows[0],
      itemResult.rows.map(mapPurchaseItemRow)
    );
  } catch (error) {
    await client.query('ROLLBACK');

    throw mapForeignKeyError(error);
  } finally {
    client.release();
  }
}

async function approvePurchaseOrder(purchaseOrderId) {
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT id,
              supplier_id,
              branch_id,
              status,
              total_amount,
              notes,
              created_by,
              created_at
       FROM purchase_orders
       WHERE id = $1
       FOR UPDATE`,
      [purchaseOrderId]
    );

    if (orderResult.rowCount === 0) {
      throw new HttpError(404, 'Purchase order not found.');
    }

    if (!['draft', 'pending'].includes(orderResult.rows[0].status)) {
      throw new HttpError(400, 'Only pending purchase orders can be approved.');
    }

    const approvedResult = await client.query(
      `UPDATE purchase_orders
       SET status = 'ordered'
       WHERE id = $1
       RETURNING id,
                 supplier_id,
                 branch_id,
                 status,
                 total_amount,
                 notes,
                 created_by,
                 created_at`,
      [purchaseOrderId]
    );

    const items = await findPurchaseItemsByOrderId(client, purchaseOrderId);

    await client.query('COMMIT');

    return mapPurchaseOrderRow(approvedResult.rows[0], items);
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
}

async function receiveInventoryItem(client, requester, purchaseOrderId, branchId, item) {
  const inventoryResult = await client.query(
    `SELECT id,
            product_id,
            variant_id,
            branch_id,
            quantity
     FROM inventory
     WHERE product_id = $1
       AND variant_id IS NULL
       AND branch_id = $2
     FOR UPDATE`,
    [item.productId, branchId]
  );

  const reason = `Purchase order ${purchaseOrderId} received`;
  let inventoryId;
  let previousQuantity;
  let newQuantity;

  if (inventoryResult.rowCount === 0) {
    previousQuantity = 0;
    newQuantity = item.quantity;

    const insertedInventory = await client.query(
      `INSERT INTO inventory (
         product_id,
         variant_id,
         branch_id,
         quantity
       )
       VALUES ($1, NULL, $2, $3)
       RETURNING id`,
      [item.productId, branchId, newQuantity]
    );

    inventoryId = insertedInventory.rows[0].id;
  } else {
    inventoryId = inventoryResult.rows[0].id;
    previousQuantity = Number(inventoryResult.rows[0].quantity);
    newQuantity = previousQuantity + item.quantity;

    await client.query(
      `UPDATE inventory
       SET quantity = $2,
           last_updated = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [inventoryId, newQuantity]
    );
  }

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
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
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
      item.productId,
      branchId,
      previousQuantity,
      newQuantity,
      item.quantity,
      reason,
      requester?.id ?? null,
    ]
  );

  return adjustmentResult.rows[0];
}

async function receivePurchaseOrder(requester, purchaseOrderId) {
  const normalizedRequester = purchaseOrderId === undefined ? null : requester;
  const normalizedPurchaseOrderId =
    purchaseOrderId === undefined ? requester : purchaseOrderId;
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT id,
              supplier_id,
              branch_id,
              status,
              total_amount,
              notes,
              created_by,
              created_at
       FROM purchase_orders
       WHERE id = $1
       FOR UPDATE`,
      [normalizedPurchaseOrderId]
    );

    if (orderResult.rowCount === 0) {
      throw new HttpError(404, 'Purchase order not found.');
    }

    if (orderResult.rows[0].status !== 'ordered') {
      throw new HttpError(400, 'Only ordered purchase orders can be received.');
    }

    const items = await findPurchaseItemsByOrderId(client, normalizedPurchaseOrderId);
    const adjustments = [];

    for (const item of items) {
      adjustments.push(
        await receiveInventoryItem(
          client,
          normalizedRequester,
          normalizedPurchaseOrderId,
          orderResult.rows[0].branch_id,
          item
        )
      );
    }

    const receivedResult = await client.query(
      `UPDATE purchase_orders
       SET status = 'received'
       WHERE id = $1
       RETURNING id,
                 supplier_id,
                 branch_id,
                 status,
                 total_amount,
                 notes,
                 created_by,
                 created_at`,
      [normalizedPurchaseOrderId]
    );

    await client.query('COMMIT');

    return {
      ...mapPurchaseOrderRow(receivedResult.rows[0], items),
      inventoryAdjustments: adjustments.map((row) => ({
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
      })),
    };
  } catch (error) {
    await client.query('ROLLBACK');

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  approvePurchaseOrder,
  createPurchaseOrder,
  mapPurchaseItemRow,
  mapPurchaseOrderRow,
  normalizePurchasePayload,
  receivePurchaseOrder,
};
