-- Add dcsname and categories columns to customers table
ALTER TABLE "customers" ADD COLUMN "dcsname" VARCHAR(255);
ALTER TABLE "customers" ADD COLUMN "categories" VARCHAR(255);
