-- Add pairing_code to devices (generate random 8-char code for existing rows)
ALTER TABLE "devices" ADD COLUMN "pairing_code" VARCHAR(10);

UPDATE "devices" SET "pairing_code" = upper(substring(md5(random()::text), 1, 8)) WHERE "pairing_code" IS NULL;

ALTER TABLE "devices" ALTER COLUMN "pairing_code" SET NOT NULL;
ALTER TABLE "devices" ADD CONSTRAINT "devices_pairing_code_key" UNIQUE ("pairing_code");

-- CreateTable
CREATE TABLE "form_responses" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "form_id" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_responses_device_id_idx" ON "form_responses"("device_id");

-- CreateIndex
CREATE INDEX "form_responses_form_id_idx" ON "form_responses"("form_id");
