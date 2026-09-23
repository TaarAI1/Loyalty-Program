-- Add form_type and web_token columns to survey_forms
ALTER TABLE "survey_forms" ADD COLUMN "form_type" VARCHAR(20) NOT NULL DEFAULT 'kiosk';
ALTER TABLE "survey_forms" ADD COLUMN "web_token" VARCHAR(100);
CREATE UNIQUE INDEX "survey_forms_web_token_key" ON "survey_forms"("web_token");
