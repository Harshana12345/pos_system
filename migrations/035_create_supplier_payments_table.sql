CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  method VARCHAR(100),
  reference_number VARCHAR(255),
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id
  ON supplier_payments (supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_paid_at
  ON supplier_payments (paid_at);
