-- Create a partial unique index on transaction_id so that:
--   1. No two web submissions share the same transaction_id (enforced at DB level)
--   2. Device submissions (transaction_id IS NULL) are unaffected
--      (NULL != NULL in PostgreSQL, so multiple NULLs are always allowed)
-- The WHERE clause makes this a partial index, which also handles any pre-existing
-- duplicate NULL values without error.
CREATE UNIQUE INDEX "form_responses_transaction_id_key"
  ON "form_responses"("transaction_id")
  WHERE "transaction_id" IS NOT NULL;
