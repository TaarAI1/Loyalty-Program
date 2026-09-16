-- Remove orphaned form_responses rows (device or form was deleted without cascade)
DELETE FROM "form_responses"
WHERE "device_id" NOT IN (SELECT id FROM "devices")
   OR "form_id"   NOT IN (SELECT id FROM "survey_forms");

-- Add missing FK constraint for device_id (cascade delete so responses are cleaned up automatically)
ALTER TABLE "form_responses"
  ADD CONSTRAINT "form_responses_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE;

-- Add missing FK constraint for form_id (cascade delete so responses are cleaned up automatically)
ALTER TABLE "form_responses"
  ADD CONSTRAINT "form_responses_form_id_fkey"
  FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE;
