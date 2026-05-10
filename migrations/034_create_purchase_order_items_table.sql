CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(12, 2) NOT NULL,
  CHECK (quantity > 0),
  CHECK (cost_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id
  ON purchase_order_items (purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id
  ON purchase_order_items (product_id);
