-- AI-proposed profile updates — one ADDITIVE column + one new audit table.
-- Run by hand (the user, not the agent), BEFORE deploying, via:
--
--   npx prisma db execute --file prisma/add-proposal-tables.sql
--
-- NEVER `prisma db push`: prod carries the orphaned CoachConfig table and the
-- retired Client.targetFiber column, and a whole-schema push would propose
-- dropping both.

-- Per-check-in proposal resolutions (accepted / dismissed / expired).
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "proposalResolutions" jsonb;

-- Self-contained audit of accepted profile updates (MacroHistory pattern).
-- No FK to CheckIn on purpose: audit must survive check-in deletion.
CREATE TABLE IF NOT EXISTS "QuestionnaireChange" (
  "id"            text PRIMARY KEY,
  "clientId"      text NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE,
  "checkInId"     text NOT NULL,
  "checkInDate"   timestamp(3) NOT NULL,
  "questionId"    text NOT NULL,
  "questionLabel" text NOT NULL,
  "oldValue"      text NOT NULL,
  "newValue"      text NOT NULL,
  "evidence"      text NOT NULL,
  "source"        text NOT NULL,
  "changedAt"     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "QuestionnaireChange_clientId_idx"
  ON "QuestionnaireChange"("clientId");
