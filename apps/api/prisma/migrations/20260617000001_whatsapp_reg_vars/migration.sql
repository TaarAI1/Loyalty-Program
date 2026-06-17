-- Add registration template variable value columns
ALTER TABLE "whatsapp_config"
  ADD COLUMN IF NOT EXISTS "reg_var_order_no_1"        TEXT,
  ADD COLUMN IF NOT EXISTS "reg_var_dispatched_order1"  TEXT;
