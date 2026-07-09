-- Migration: add points_remaining to points_expiry for FIFO expiry tracking
-- points_remaining tracks how many points in this batch have NOT yet been consumed
-- by redemptions. The expiry job deducts pointsRemaining (not pointsAmount) so
-- already-redeemed points are never double-expired.

ALTER TABLE "points_expiry" ADD COLUMN "points_remaining" INTEGER NOT NULL DEFAULT 0;

-- Backfill: active (not yet expired) rows retain their full earned amount as remaining
UPDATE "points_expiry"
SET "points_remaining" = "points_amount"
WHERE "is_expired" = false;

-- Already-expired rows keep points_remaining = 0 (those points are already gone)

-- Index to efficiently query active batches ordered by expiry date (FIFO redemption)
CREATE INDEX "points_expiry_customer_active_idx"
  ON "points_expiry" ("customer_id", "is_expired", "expiry_date");
