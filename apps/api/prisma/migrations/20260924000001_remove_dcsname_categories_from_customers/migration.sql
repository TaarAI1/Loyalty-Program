-- Remove dcsname and categories columns from customers table
ALTER TABLE "customers" DROP COLUMN IF EXISTS "dcsname";
ALTER TABLE "customers" DROP COLUMN IF EXISTS "categories";
