ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS received_quantity INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE purchase_order_items
    ADD CONSTRAINT purchase_order_items_received_quantity_check
    CHECK (received_quantity >= 0 AND received_quantity <= quantity);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
