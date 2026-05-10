CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  tax_id VARCHAR(100),
  notes TEXT,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_status
  ON suppliers (status);

CREATE INDEX IF NOT EXISTS idx_suppliers_email
  ON suppliers (email);
