INSERT INTO branches (id, name, address, contact, tax_info, currency, status)
VALUES (1, 'Default Branch', NULL, NULL, NULL, 'USD', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  contact = EXCLUDED.contact,
  tax_info = EXCLUDED.tax_info,
  currency = EXCLUDED.currency,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

SELECT setval(
  pg_get_serial_sequence('branches', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM branches), 1),
  true
);
