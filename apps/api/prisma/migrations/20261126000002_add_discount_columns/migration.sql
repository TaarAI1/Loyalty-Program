-- Missing columns that exist in Prisma schema but were never migrated
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "total_discount" DECIMAL(10,2);
ALTER TABLE "transaction_items" ADD COLUMN IF NOT EXISTS "item_discount" DECIMAL(10,2);
