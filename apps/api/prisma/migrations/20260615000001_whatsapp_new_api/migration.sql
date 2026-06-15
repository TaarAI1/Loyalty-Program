-- Add new WhatsApp API fields to whatsapp_config
ALTER TABLE "whatsapp_config"
  ADD COLUMN IF NOT EXISTS "api_url"             TEXT,
  ADD COLUMN IF NOT EXISTS "api_key"             TEXT,
  ADD COLUMN IF NOT EXISTS "csrf_token"          TEXT,
  ADD COLUMN IF NOT EXISTS "birthday_vars_order" TEXT,
  ADD COLUMN IF NOT EXISTS "birthday_vars_wish"  TEXT;
