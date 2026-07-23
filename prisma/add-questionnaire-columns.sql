-- Per-coach client questionnaire — two ADDITIVE nullable columns.
-- Run by hand (the user, not the agent) BEFORE deploying the questionnaire
-- feature, via:
--
--   npx prisma db execute --file prisma/add-questionnaire-columns.sql
--
-- (Uses DIRECT_URL / session port 5432 per prisma.config.ts — the same
-- surgical path used to add Client.language. NEVER `prisma db push`: prod
-- carries the orphaned CoachConfig table and Client.targetFiber column, and a
-- whole-schema push would propose dropping both.)
--
-- Nullable, no defaults, no backfill: existing rows are untouched and the app
-- treats NULL as "defaults" (coach) / "no context" (client).

ALTER TABLE "Coach"  ADD COLUMN IF NOT EXISTS "questionnaire" jsonb;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "questionnaireAnswers" jsonb;
