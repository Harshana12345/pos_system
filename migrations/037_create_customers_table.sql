CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (loyalty_points >= 0),
  CHECK (credit_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers (status);

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers (phone);

CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers (email);
