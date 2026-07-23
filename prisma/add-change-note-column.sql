-- Weekly "did anything change?" coach note — one ADDITIVE nullable column.
-- Run by hand (the user, not the agent), BEFORE deploying this feature, via:
--
--   npx prisma db execute --file prisma/add-change-note-column.sql
--
-- NEVER `prisma db push`: prod carries the orphaned CoachConfig table and the
-- retired Client.targetFiber column, and a whole-schema push would propose
-- dropping both.
--
-- Nullable, no default, no backfill: every existing check-in reads as
-- "no change recorded", which is exactly right.

ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "changeNote" text;
