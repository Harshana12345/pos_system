CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (previous_quantity >= 0),
  CHECK (new_quantity >= 0),
  CHECK (length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_inventory_id_created_at
  ON inventory_adjustments (inventory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_adjusted_by_user_id
  ON inventory_adjustments (adjusted_by_user_id);
