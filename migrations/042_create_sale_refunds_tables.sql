CREATE TABLE IF NOT EXISTS sale_refunds (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_refunds_sale_id
  ON sale_refunds (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_refunds_created_at
  ON sale_refunds (created_at);

CREATE TABLE IF NOT EXISTS sale_refund_items (
  id BIGSERIAL PRIMARY KEY,
  refund_id BIGINT NOT NULL REFERENCES sale_refunds(id) ON DELETE CASCADE,
  sale_item_id BIGINT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  CHECK (quantity > 0),
  CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_refund_items_refund_id
  ON sale_refund_items (refund_id);

CREATE INDEX IF NOT EXISTS idx_sale_refund_items_sale_item_id
  ON sale_refund_items (sale_item_id);
