-- DropForeignKey
ALTER TABLE "auto_transfer_logs" DROP CONSTRAINT "auto_transfer_logs_from_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auto_transfer_logs" DROP CONSTRAINT "auto_transfer_logs_to_user_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_from_user_id_fkey";

-- DropIndex
DROP INDEX "invoices_from_user_id_idx";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "from_user_id",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "from_party" TEXT NOT NULL DEFAULT 'CCB Mart',
ADD COLUMN     "month" TEXT,
ADD COLUMN     "payout_type" TEXT;

-- DropTable
DROP TABLE "auto_transfer_logs";

-- CreateTable
CREATE TABLE "payout_logs" (
    "id" SERIAL NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "partner_name" TEXT NOT NULL,
    "partner_rank" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_amount" DECIMAL(15,0) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "has_valid_log" BOOLEAN NOT NULL DEFAULT false,
    "k_factor" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bank_transfer_id" TEXT,
    "bank_transfer_status" TEXT,

    CONSTRAINT "payout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_logs_month_idx" ON "payout_logs"("month");

-- CreateIndex
CREATE INDEX "payout_logs_status_idx" ON "payout_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payout_logs_partner_id_month_key" ON "payout_logs"("partner_id", "month");

-- CreateIndex
CREATE INDEX "invoices_payout_type_idx" ON "invoices"("payout_type");

-- CreateIndex
CREATE INDEX "invoices_month_idx" ON "invoices"("month");

-- AddForeignKey
ALTER TABLE "payout_logs" ADD CONSTRAINT "payout_logs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

