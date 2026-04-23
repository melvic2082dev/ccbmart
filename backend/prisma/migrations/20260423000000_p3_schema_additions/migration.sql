-- P3: Schema additions (2026-04-23)
-- Reconciles with gap analysis C12.4 vs V13.2.1
-- Refs: Doc 7.6 (credibility), 7.7 (fast-track), 7.8 (soft salary), 7.10 (acting manager)
--
-- ROLLBACK: see scripts/rollback_p3.sql

-- ── KpiLog: add fields required for 3-consecutive-month GĐV/GĐKD check ──────
ALTER TABLE "kpi_logs" ADD COLUMN "team_combo_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "kpi_logs" ADD COLUMN "consecutive_months" INTEGER NOT NULL DEFAULT 1;

-- ── SoftSalaryAdjustment ─────────────────────────────────────────────────────
CREATE TABLE "soft_salary_adjustments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "original_salary" DECIMAL(15,0) NOT NULL,
    "adjusted_salary" DECIMAL(15,0) NOT NULL,
    "performance_bonus" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "cap_factor" DECIMAL(5,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soft_salary_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "soft_salary_adjustments_user_id_month_key" ON "soft_salary_adjustments"("user_id", "month");
CREATE INDEX "soft_salary_adjustments_month_idx" ON "soft_salary_adjustments"("month");
ALTER TABLE "soft_salary_adjustments" ADD CONSTRAINT "soft_salary_adjustments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── FastTrackRequest ──────────────────────────────────────────────────────────
CREATE TABLE "fast_track_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "requested_rank" TEXT NOT NULL,
    "kpi_multiple" DECIMAL(5,2) NOT NULL,
    "month" TEXT NOT NULL,
    "nominated_by_id" INTEGER,
    "approved_by_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "fast_track_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fast_track_requests_user_id_month_key" ON "fast_track_requests"("user_id", "month");
CREATE INDEX "fast_track_requests_status_idx" ON "fast_track_requests"("status");
ALTER TABLE "fast_track_requests" ADD CONSTRAINT "fast_track_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fast_track_requests" ADD CONSTRAINT "fast_track_requests_nominated_by_id_fkey"
    FOREIGN KEY ("nominated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fast_track_requests" ADD CONSTRAINT "fast_track_requests_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ActingManagerAssignment ───────────────────────────────────────────────────
CREATE TABLE "acting_manager_assignments" (
    "id" SERIAL NOT NULL,
    "assignee_id" INTEGER NOT NULL,
    "vacant_user_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "bonus_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    "max_months" INTEGER NOT NULL DEFAULT 6,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assigned_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acting_manager_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "acting_manager_assignments_assignee_id_idx" ON "acting_manager_assignments"("assignee_id");
CREATE INDEX "acting_manager_assignments_status_idx" ON "acting_manager_assignments"("status");
ALTER TABLE "acting_manager_assignments" ADD CONSTRAINT "acting_manager_assignments_assignee_id_fkey"
    FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acting_manager_assignments" ADD CONSTRAINT "acting_manager_assignments_vacant_user_id_fkey"
    FOREIGN KEY ("vacant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acting_manager_assignments" ADD CONSTRAINT "acting_manager_assignments_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── TrainingCredibilityScore ──────────────────────────────────────────────────
CREATE TABLE "training_credibility_scores" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "suspended_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_credibility_scores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "training_credibility_scores_user_id_key" ON "training_credibility_scores"("user_id");
ALTER TABLE "training_credibility_scores" ADD CONSTRAINT "training_credibility_scores_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── TrainingCredibilityEvent ──────────────────────────────────────────────────
CREATE TABLE "training_credibility_events" (
    "id" SERIAL NOT NULL,
    "score_id" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_credibility_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "training_credibility_events_score_id_idx" ON "training_credibility_events"("score_id");
ALTER TABLE "training_credibility_events" ADD CONSTRAINT "training_credibility_events_score_id_fkey"
    FOREIGN KEY ("score_id") REFERENCES "training_credibility_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
