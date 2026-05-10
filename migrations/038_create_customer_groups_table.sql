CREATE TABLE IF NOT EXISTS customer_groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_group_id BIGINT REFERENCES customer_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_groups_status
  ON customer_groups (status);

CREATE INDEX IF NOT EXISTS idx_customers_customer_group_id
  ON customers (customer_group_id);
