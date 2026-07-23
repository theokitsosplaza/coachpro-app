# Known issues

Recorded, deliberately not yet fixed. Remove entries when resolved.

## Clearing a weekly change note has no confirm guard

**Recorded:** 2026-07-23 · **Status:** open, deliberate for now

The coach edit form's "Did anything change this week?" note
(`CheckIn.changeNote`) can be cleared by emptying the textarea and saving —
no confirmation, unlike the client-reflection clear guard. Deliberate today:
the note is the coach's own text and trivially retypeable. This becomes a real
risk once **AI-proposed profile updates** ship, because a change note may be
the recorded trigger for a pending questionnaire-update proposal — silently
clearing the note would orphan or invalidate the proposal's provenance. Add a
guard (or make notes immutable-once-proposal-exists) as part of that ticket.

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
