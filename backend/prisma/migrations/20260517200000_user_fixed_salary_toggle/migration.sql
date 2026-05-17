-- Per-user opt-in for "lương cứng" (fixed salary).
-- A CTV can be promoted to a senior rank but still excluded from the
-- rank-default fixed salary until a specific month — useful for "đề bạt
-- trước, hưởng lương sau". When fixed_salary_enabled=true and the queried
-- month is on/after fixed_salary_start_date, the rank's fixedSalary is
-- included in commission totalIncome; otherwise 0.

ALTER TABLE "users"
  ADD COLUMN "fixed_salary_enabled"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "fixed_salary_start_date" TIMESTAMP(3);

CREATE INDEX "users_fixed_salary_enabled_idx" ON "users"("fixed_salary_enabled");
