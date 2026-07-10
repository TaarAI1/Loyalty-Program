ALTER TABLE "points_expiry"
  ALTER COLUMN "expiry_date" TYPE TIMESTAMPTZ
  USING "expiry_date"::TIMESTAMPTZ,
  ALTER COLUMN "earning_date" TYPE TIMESTAMPTZ
  USING "earning_date"::TIMESTAMPTZ;
