-- HR description fields on User, used to capture sales experience / bio
-- and birth year so admin can keep a short profile alongside the rank.

ALTER TABLE "users"
  ADD COLUMN "bio"        TEXT,
  ADD COLUMN "birth_year" INTEGER;
