CREATE TABLE IF NOT EXISTS "pending_surveys" (
  "id"             SERIAL PRIMARY KEY,
  "device_id"      INT NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "customer_name"  VARCHAR(255),
  "customer_phone" VARCHAR(20),
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pending_surveys_device_id_idx" ON "pending_surveys"("device_id");
