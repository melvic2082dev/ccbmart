-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "rank_history" ADD COLUMN     "changed_by_id" INTEGER;

-- AlterTable: add updated_at with default for existing rows, then set NOT NULL
ALTER TABLE "users" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ctv_hierarchy_ctv_id_idx" ON "ctv_hierarchy"("ctv_id");

-- CreateIndex
CREATE INDEX "ctv_hierarchy_manager_id_idx" ON "ctv_hierarchy"("manager_id");

-- CreateIndex
CREATE INDEX "training_logs_trainer_id_idx" ON "training_logs"("trainer_id");

-- CreateIndex
CREATE INDEX "training_logs_trainee_id_idx" ON "training_logs"("trainee_id");

-- AddForeignKey
ALTER TABLE "admin_manual_actions" ADD CONSTRAINT "admin_manual_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
