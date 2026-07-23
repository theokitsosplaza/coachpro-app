-- Per-coach configuration bag — one ADDITIVE nullable column on Coach.
-- Run by hand (the user, not the agent), BEFORE deploying, via:
--
--   npx prisma db execute --file prisma/add-coach-config-column.sql
--
-- NEVER `prisma db push`: prod carries the orphaned CoachConfig TABLE and the
-- retired Client.targetFiber column, and a whole-schema push would propose
-- dropping both. This column has NOTHING to do with that old CoachConfig
-- table — leave that table untouched.
--
-- Nullable, no default, no backfill: every existing coach reads as "defaults".

ALTER TABLE "Coach" ADD COLUMN IF NOT EXISTS "config" jsonb;
