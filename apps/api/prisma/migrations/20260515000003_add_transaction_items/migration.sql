CREATE TABLE "transaction_items" (
    "id"             BIGSERIAL NOT NULL,
    "transaction_id" UUID NOT NULL,
    "sku"            VARCHAR(100),
    "description"    VARCHAR(500),
    "qty"            DECIMAL(10,3) NOT NULL,
    "unit_price"     DECIMAL(10,2) NOT NULL,
    "total_price"    DECIMAL(10,2) NOT NULL,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_item_transaction" ON "transaction_items"("transaction_id");

ALTER TABLE "transaction_items"
  ADD CONSTRAINT "transaction_items_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
