const database = require('../config/database');
const Supplier = require('../models/Supplier');
const HttpError = require('../utils/httpError');
const {
  mapPurchaseItemRow,
  mapPurchaseOrderRow,
} = require('./purchaseService');

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeBalance(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return Number(value);
}

function mapSupplierRow(row) {
  return new Supplier({
    id: row.id,
    name: row.name,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    taxId: row.tax_id,
    notes: row.notes,
    balance: Number(row.balance),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function findAll() {
  const result = await database.query(
    `SELECT id,
            name,
            contact_number,
            email,
            address,
            tax_id,
            notes,
            balance,
            status,
            created_at,
            updated_at
     FROM suppliers
     ORDER BY id ASC`
  );

  return result.rows.map(mapSupplierRow);
}

async function createSupplier({
  name,
  contactNumber,
  contact_number,
  email,
  address,
  taxId,
  tax_id,
  notes,
  balance,
  status,
}) {
  const result = await database.query(
    `INSERT INTO suppliers (
       name,
       contact_number,
       email,
       address,
       tax_id,
       notes,
       balance,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id,
               name,
               contact_number,
               email,
               address,
               tax_id,
               notes,
               balance,
               status,
               created_at,
               updated_at`,
    [
      name.trim(),
      normalizeNullableString(contactNumber ?? contact_number),
      normalizeNullableString(email),
      normalizeNullableString(address),
      normalizeNullableString(taxId ?? tax_id),
      normalizeNullableString(notes),
      normalizeBalance(balance),
      status || 'active',
    ]
  );

  return mapSupplierRow(result.rows[0]);
}

async function updateSupplier(
  id,
  {
    name,
    contactNumber,
    contact_number,
    email,
    address,
    taxId,
    tax_id,
    notes,
    balance,
    status,
  }
) {
  const result = await database.query(
    `UPDATE suppliers
     SET name = $2,
         contact_number = $3,
         email = $4,
         address = $5,
         tax_id = $6,
         notes = $7,
         balance = $8,
         status = $9,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id,
               name,
               contact_number,
               email,
               address,
               tax_id,
               notes,
               balance,
               status,
               created_at,
               updated_at`,
    [
      Number(id),
      name.trim(),
      normalizeNullableString(contactNumber ?? contact_number),
      normalizeNullableString(email),
      normalizeNullableString(address),
      normalizeNullableString(taxId ?? tax_id),
      normalizeNullableString(notes),
      normalizeBalance(balance),
      status || 'active',
    ]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Supplier not found.');
  }

  return mapSupplierRow(result.rows[0]);
}

async function deleteSupplier(id) {
  const result = await database.query(
    `DELETE FROM suppliers
     WHERE id = $1
     RETURNING id`,
    [Number(id)]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Supplier not found.');
  }
}

async function findPurchaseHistoryById(id) {
  const supplierId = Number(id);
  const supplierResult = await database.query(
    `SELECT id
     FROM suppliers
     WHERE id = $1`,
    [supplierId]
  );

  if (supplierResult.rowCount === 0) {
    throw new HttpError(404, 'Supplier not found.');
  }

  const result = await database.query(
    `SELECT po.id,
            po.supplier_id,
            po.branch_id,
            po.status,
            po.total_amount,
            po.notes,
            po.created_by,
            po.created_at,
            poi.id AS item_id,
            poi.purchase_order_id,
            poi.product_id,
            poi.quantity,
            poi.cost_price
     FROM purchase_orders po
     LEFT JOIN purchase_order_items poi
       ON poi.purchase_order_id = po.id
     WHERE po.supplier_id = $1
     ORDER BY po.created_at DESC, po.id DESC, poi.id ASC`,
    [supplierId]
  );

  const purchasesById = new Map();

  for (const row of result.rows) {
    if (!purchasesById.has(row.id)) {
      purchasesById.set(row.id, {
        row,
        items: [],
      });
    }

    if (row.item_id !== null && row.item_id !== undefined) {
      purchasesById.get(row.id).items.push(
        mapPurchaseItemRow({
          id: row.item_id,
          purchase_order_id: row.purchase_order_id,
          product_id: row.product_id,
          quantity: row.quantity,
          cost_price: row.cost_price,
        })
      );
    }
  }

  return Array.from(purchasesById.values()).map(({ row, items }) =>
    mapPurchaseOrderRow(row, items)
  );
}

module.exports = {
  createSupplier,
  deleteSupplier,
  findAll,
  findPurchaseHistoryById,
  mapSupplierRow,
  updateSupplier,
};
