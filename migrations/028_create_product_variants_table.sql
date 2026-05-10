CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_status
  ON product_variants (status);
