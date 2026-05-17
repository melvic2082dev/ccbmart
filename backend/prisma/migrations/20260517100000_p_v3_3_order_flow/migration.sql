-- p_v3_3: Order flow redesign — draft → inventory confirm → payment → packing → pickup → OTP/signature → delivered
-- See docs/specs/04_OPERATIONAL_FLOW_V3_3.md

-- Extend transactions with state-machine timestamps + OTP + signature columns
ALTER TABLE "transactions"
  ADD COLUMN "drafted_at"                  TIMESTAMP(3),
  ADD COLUMN "inventory_confirmed_at"      TIMESTAMP(3),
  ADD COLUMN "inventory_confirmed_by"      INTEGER,
  ADD COLUMN "inventory_rejected_reason"   TEXT,
  ADD COLUMN "paid_at"                     TIMESTAMP(3),
  ADD COLUMN "packing_started_at"          TIMESTAMP(3),
  ADD COLUMN "packed_at"                   TIMESTAMP(3),
  ADD COLUMN "packed_by"                   INTEGER,
  ADD COLUMN "warehouse_id"                INTEGER,
  ADD COLUMN "pickup_code"                 TEXT,
  ADD COLUMN "picked_up_at"                TIMESTAMP(3),
  ADD COLUMN "delivery_otp_hash"           TEXT,
  ADD COLUMN "delivery_otp_sent_at"        TIMESTAMP(3),
  ADD COLUMN "delivery_otp_verified_at"    TIMESTAMP(3),
  ADD COLUMN "delivery_otp_attempts"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_otp_blocked_until"  TIMESTAMP(3),
  ADD COLUMN "delivery_signature_url"      TEXT,
  ADD COLUMN "delivered_at"                TIMESTAMP(3),
  ADD COLUMN "cancelled_at"                TIMESTAMP(3),
  ADD COLUMN "cancelled_by"                INTEGER,
  ADD COLUMN "cancelled_reason"            TEXT;

CREATE UNIQUE INDEX "transactions_pickup_code_key" ON "transactions"("pickup_code");
CREATE INDEX "transactions_warehouse_id_idx" ON "transactions"("warehouse_id");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Audit trail of every status transition
CREATE TABLE "transaction_status_logs" (
  "id"              SERIAL PRIMARY KEY,
  "transaction_id"  INTEGER NOT NULL,
  "from_status"     TEXT,
  "to_status"       TEXT NOT NULL,
  "actor_id"        INTEGER,
  "actor_role"      TEXT,
  "note"            TEXT,
  "at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "transaction_status_logs_tx_idx" ON "transaction_status_logs"("transaction_id");
CREATE INDEX "transaction_status_logs_at_idx" ON "transaction_status_logs"("at");

ALTER TABLE "transaction_status_logs" ADD CONSTRAINT "transaction_status_logs_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Users may be assigned to a specific warehouse (for warehouse_staff role)
ALTER TABLE "users" ADD COLUMN "warehouse_id" INTEGER;
CREATE INDEX "users_warehouse_id_idx" ON "users"("warehouse_id");

ALTER TABLE "users" ADD CONSTRAINT "users_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
