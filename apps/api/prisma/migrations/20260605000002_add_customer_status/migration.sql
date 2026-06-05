-- Add status column to customers table (active / inactive / blocked)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
