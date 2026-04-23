-- P3 rollback script (2026-04-23)
-- Run BEFORE rolling back to commit prior to P3.
-- Always take a pg_dump backup first:
--   pg_dump $DATABASE_URL > backup_before_rollback_p3.sql
--
-- Order matters: drop dependent tables first.

DROP TABLE IF EXISTS "training_credibility_events";
DROP TABLE IF EXISTS "training_credibility_scores";
DROP TABLE IF EXISTS "acting_manager_assignments";
DROP TABLE IF EXISTS "fast_track_requests";
DROP TABLE IF EXISTS "soft_salary_adjustments";

ALTER TABLE "kpi_logs" DROP COLUMN IF EXISTS "team_combo_count";
ALTER TABLE "kpi_logs" DROP COLUMN IF EXISTS "consecutive_months";

-- Remove migration record so Prisma does not think it is applied:
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260423000000_p3_schema_additions';
