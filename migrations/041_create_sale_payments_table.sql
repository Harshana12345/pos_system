CREATE TABLE IF NOT EXISTS sale_payments (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id
  ON sale_payments (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_payments_paid_at
  ON sale_payments (paid_at);
