-- Survey questions
CREATE TABLE "survey_questions" (
  "id"            SERIAL NOT NULL,
  "text"          TEXT NOT NULL,
  "question_type" VARCHAR(20) NOT NULL DEFAULT 'text',
  "status"        VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- Survey forms
CREATE TABLE "survey_forms" (
  "id"         SERIAL NOT NULL,
  "name"       VARCHAR(255) NOT NULL,
  "status"     VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survey_forms_pkey" PRIMARY KEY ("id")
);

-- Form ↔ Question join
CREATE TABLE "survey_form_questions" (
  "id"          SERIAL NOT NULL,
  "form_id"     INTEGER NOT NULL,
  "question_id" INTEGER NOT NULL,
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "survey_form_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "survey_form_questions_form_id_fkey"
    FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE,
  CONSTRAINT "survey_form_questions_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE
);
CREATE INDEX "sfq_form_idx"     ON "survey_form_questions"("form_id");
CREATE INDEX "sfq_question_idx" ON "survey_form_questions"("question_id");

-- Devices
CREATE TABLE "devices" (
  "id"          SERIAL NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "device_type" VARCHAR(20) NOT NULL DEFAULT 'workstation',
  "store"       VARCHAR(100),
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- Form assignments
CREATE TABLE "form_assignments" (
  "id"          SERIAL NOT NULL,
  "form_id"     INTEGER NOT NULL,
  "device_id"   INTEGER NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "form_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "form_assignments_form_id_fkey"
    FOREIGN KEY ("form_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE,
  CONSTRAINT "form_assignments_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE
);
CREATE INDEX "fa_form_idx"   ON "form_assignments"("form_id");
CREATE INDEX "fa_device_idx" ON "form_assignments"("device_id");
