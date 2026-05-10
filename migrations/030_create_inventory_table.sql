CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (quantity >= 0),
  UNIQUE (product_id, variant_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id
  ON inventory (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id
  ON inventory (variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_branch_id
  ON inventory (branch_id);
