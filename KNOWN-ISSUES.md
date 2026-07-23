# Known issues

Recorded, deliberately not yet fixed. Remove entries when resolved.

## Clearing a weekly change note has no confirm guard

**Recorded:** 2026-07-23 · **Status:** RESOLVED BY DESIGN 2026-07-23 (part 3)

The coach edit form's "Did anything change this week?" note
(`CheckIn.changeNote`) can be cleared with no confirmation. The feared risk —
that clearing a note would orphan a pending proposal's provenance once
AI-proposed profile updates shipped — was closed structurally instead of with
a guard: the `QuestionnaireChange` audit table snapshots the **evidence
quote**, label, old/new values, and check-in date on every accepted proposal,
so the audit trail is fully self-contained and survives note clearing,
question edits, and even check-in deletion. Pending (unaccepted) proposals
regenerate from the analysis or resolve via `proposalResolutions`; a cleared
note simply means the next regeneration has less context — the coach's own
choice. No guard needed.

## Editing an approved check-in destroys the approved AI client message (data loss)

**Recorded:** 2026-07-23 · **Status:** open, out of scope of the delete/date-edit work that recorded it

`updateCoachCheckIn` (`app/(coach)/clients/[id]/check-in/[checkInId]/edit/actions.ts`)
nulls `aiSynthesis` unconditionally on every save and resets an Approved
check-in to Pending. For a Pending row that is exactly right — the cache must
regenerate. But for an **Approved** row, `aiSynthesis` holds the approved
snapshot written at approval time (`app/api/checkin-approve/route.ts`),
including the client-facing message the coach may have edited and already sent.
A coach who edits an approved check-in — even only to fix a typo'd weight or
redate it — silently and irreversibly loses that approved text.

Possible directions when this is picked up: preserve the approved snapshot in a
separate column; require an explicit "un-approve" step with a warning before an
approved row becomes editable; or show the about-to-be-lost message in the edit
form's approved-row warning banner.
