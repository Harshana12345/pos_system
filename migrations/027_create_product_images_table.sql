CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id_display_order
  ON product_images (product_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary_per_product
  ON product_images (product_id)
  WHERE is_primary;
