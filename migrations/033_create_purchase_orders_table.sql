CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON purchase_orders (supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id
  ON purchase_orders (branch_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders (status);
