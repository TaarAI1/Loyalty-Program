-- Add new WhatsApp API connection fields
ALTER TABLE "whatsapp_config"
  ADD COLUMN IF NOT EXISTS "api_url"    TEXT,
  ADD COLUMN IF NOT EXISTS "api_key"    TEXT,
  ADD COLUMN IF NOT EXISTS "csrf_token" TEXT;
