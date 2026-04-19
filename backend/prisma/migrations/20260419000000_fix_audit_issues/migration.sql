-- AlterTable: Add unique constraint on customers.phone
ALTER TABLE "customers" ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");

-- AlterTable: Add payment fields to breakaway_fees
ALTER TABLE "breakaway_fees" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "breakaway_fees" ADD COLUMN "payment_method" TEXT;
ALTER TABLE "breakaway_fees" ADD COLUMN "reference" TEXT;
