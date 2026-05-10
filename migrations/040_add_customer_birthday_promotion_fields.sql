ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE INDEX IF NOT EXISTS idx_customers_date_of_birth
  ON customers (date_of_birth);
