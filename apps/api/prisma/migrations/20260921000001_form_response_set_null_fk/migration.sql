-- Migration: change form_responses FKs from CASCADE to SET NULL
-- so that deleting a form or device no longer deletes historical feedback.

-- 1. Make FK columns nullable
ALTER TABLE "form_responses" ALTER COLUMN "form_id"   DROP NOT NULL;
ALTER TABLE "form_responses" ALTER COLUMN "device_id" DROP NOT NULL;

-- 2. Drop the existing CASCADE constraints (added in the previous migration)
ALTER TABLE "form_responses" DROP CONSTRAINT IF EXISTS "form_responses_form_id_fkey";
ALTER TABLE "form_responses" DROP CONSTRAINT IF EXISTS "form_responses_device_id_fkey";

-- 3. Re-add with ON DELETE SET NULL
ALTER TABLE "form_responses"
  ADD CONSTRAINT "form_responses_form_id_fkey"
  FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE SET NULL;

ALTER TABLE "form_responses"
  ADD CONSTRAINT "form_responses_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL;
