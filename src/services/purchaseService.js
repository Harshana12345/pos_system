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

module.exports = {
  createPurchaseOrder,
  mapPurchaseItemRow,
  mapPurchaseOrderRow,
  normalizePurchasePayload,
};
