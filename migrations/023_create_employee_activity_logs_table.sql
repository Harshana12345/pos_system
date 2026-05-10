CREATE TABLE IF NOT EXISTS employee_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_employee_id_created_at
  ON employee_activity_logs (employee_id, created_at DESC);
