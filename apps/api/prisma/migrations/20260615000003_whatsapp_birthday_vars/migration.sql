-- Add birthday template variable value columns
ALTER TABLE "whatsapp_config"
  ADD COLUMN IF NOT EXISTS "birthday_var_order"      TEXT,
  ADD COLUMN IF NOT EXISTS "birthday_var_dispatched"  TEXT;
