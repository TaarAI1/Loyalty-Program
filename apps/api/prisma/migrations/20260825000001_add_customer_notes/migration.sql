CREATE TABLE "customer_notes" (
  "id" SERIAL NOT NULL,
  "customer_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "added_by" VARCHAR(100) NOT NULL DEFAULT 'admin',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_notes_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
);
CREATE INDEX "customer_notes_customer_id_idx" ON "customer_notes"("customer_id");
