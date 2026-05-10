CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (subtotal >= 0),
  CHECK (discount_amount >= 0),
  CHECK (tax_amount >= 0),
  CHECK (total_amount >= 0),
  CHECK (paid_amount >= 0),
  CHECK (balance_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_customer_id
  ON sales (customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_branch_id
  ON sales (branch_id);

CREATE INDEX IF NOT EXISTS idx_sales_status
  ON sales (status);

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL,
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (discount_amount >= 0),
  CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON sale_items (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
  ON sale_items (product_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id
  ON sale_items (variant_id);
