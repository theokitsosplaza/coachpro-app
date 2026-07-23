import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeClient, rationaleForFinalWarnings, type ClientInput, type CheckInInput } from '@/lib/coach-engine';
import { generateCoachOutput, type AiCoachOutput } from '@/lib/ai-coach';
import { appendAttentionFlag, parseAttentionSignal } from '@/lib/attention-flag';
import {
  parseCoachQuestions,
  parseAnswerSet,
  renderQuestionnaireContext,
  visibleAnswers,
  parseProposals,
  parseResolutions,
  filterValidProposals,
} from '@/lib/questionnaire';
import { mergeCoachConfig } from '@/lib/coach-config';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

// ===========================================================================
// GET /api/checkin-analysis?clientId=<id>
// ---------------------------------------------------------------------------
// Runs the full pipeline for a specific client and returns everything the
// AI Check-ins page needs to render: the engine Synthesis (deterministic math)
// and the aiOutput (Claude-written coach summary + client message).
//
// The latest check-in's id is also returned so the Approve button knows
// which row to stamp as "approved" when the coach confirms.
// ===========================================================================

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({
    where:  { authUserId: data.claims.sub },
    // questionnaire: the coach's CURRENT question list (deleted questions purge
    // from the AI context immediately). config: per-coach dials that gate the
    // prompt — showMacros (omit macro talk) and draftClientMessage (skip the
    // client message field). See lib/questionnaire / lib/coach-config.
    select: { id: true, questionnaire: true, config: true },
  });
  if (!coach) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // ---- 1. Validate the query parameter ----------------------------------
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: clientId' },
        { status: 400 },
      );
    }

    // ---- 2. Load client + all check-ins -----------------------------------
    // Ascending date order so analyzeClient()'s least-squares slope reads
    // the data chronologically (oldest → newest).
    const row = await prisma.client.findUnique({
      where: { id: clientId },
      // id breaks exact-timestamp ties so "latest"/"previous" are deterministic
      // (date alone left equal timestamps in undefined order).
      include: { checkIns: { orderBy: [{ date: 'asc' }, { id: 'asc' }] } },
    });

    if (!row) {
      return NextResponse.json(
        { error: `Client "${clientId}" not found.` },
        { status: 404 },
      );
    }

    if (row.coachId !== coach.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // The engine needs at least two points to fit a weight trend line.
    // `code` lets the UI render this as a neutral not-enough-data state rather
    // than a red error — it is an ordinary situation (new client, or a coach
    // deleted down to one check-in), not a fault.
    if (row.checkIns.length < 2) {
      return NextResponse.json(
        {
          error: 'This client needs at least 2 check-ins before an analysis can be generated.',
          code: 'INSUFFICIENT_DATA',
        },
        { status: 400 },
      );
    }

    // ---- 3. Map DB rows → engine input shapes ----------------------------
    // Field names are identical between the Prisma schema and the engine
    // types — no renaming needed.
    const clientInput: ClientInput = {
      id:            row.id,
      name:          row.name,
      goal:          row.goal,
      currentPhase:  row.currentPhase,
      targetProtein: row.targetProtein,
      targetCarbs:   row.targetCarbs,
      targetFats:    row.targetFats,
      language:      row.language,
    };

    const checkInInputs: CheckInInput[] = row.checkIns.map((c: (typeof row.checkIns)[number]) => ({
      id:            c.id,
      date:          c.date,
      weight:        c.weight,
      sleepScore:    c.sleepScore,
      fatigueScore:  c.fatigueScore,
      loggedProtein: c.loggedProtein,
      loggedCarbs:   c.loggedCarbs,
      loggedFats:    c.loggedFats,
      cycleAffected: c.cycleAffected,
    }));

    // The latest check-in (last in ascending-date order) powers the
    // insight stat cards shown in the UI header.
    const latest = row.checkIns[row.checkIns.length - 1];

    // The immediately-preceding check-in — always present here (the < 2 guard
    // above), though its reflection may be empty (coach-created / backfilled
    // rows). Passed to the AI as tone-only context for a week-over-week
    // qualitative read; the AI layer omits the comparison entirely when either
    // reflection is blank, so nothing changes for a genuine single-week analysis.
    const previous = row.checkIns[row.checkIns.length - 2];

    // ---- 4. Run the deterministic engine ----------------------------------
    const synthesis = analyzeClient(clientInput, checkInInputs);

    // ---- 5. AI narrative layer — generate once, cache to aiSynthesis ------
    // On first view: call Claude, save result. On subsequent views: read the
    // saved result, skip the Claude call entirely. Cache is cleared whenever
    // the check-in is edited (see updateCoachCheckIn action).
    let aiOutput: AiCoachOutput | null = null;

    // Parsed once — feeds the AI context, proposal validation, and rendering.
    const coachQuestions = parseCoachQuestions(coach.questionnaire);
    const clientAnswers  = parseAnswerSet(row.questionnaireAnswers);
    // Per-coach dials that gate the PROMPT (not just the UI): showMacros omits
    // macro/adherence language from coachSummary; draftClientMessage off drops
    // the client message entirely. Defaults ⇒ byte-identical prompts.
    const { showMacros, draftClientMessage } = mergeCoachConfig(coach.config);

    if (latest.aiSynthesis) {
      try {
        const cached = JSON.parse(latest.aiSynthesis) as Record<string, unknown>;
        // clientMessage may be legitimately absent (draftClientMessage was off
        // when this was cached); require only coachSummary to accept the cache.
        if (typeof cached.coachSummary === 'string') {
          aiOutput = {
            coachSummary:  cached.coachSummary,
            clientMessage: typeof cached.clientMessage === 'string' ? cached.clientMessage : '',
            attention:     parseAttentionSignal(cached.attention),
            // Older caches lack the key — parses to []. Resolution filtering
            // below re-applies on every read (resolutions can grow after the
            // cache was written).
            profileUpdateProposals: parseProposals(cached.profileUpdateProposals),
            // A cached analysis is, by definition, a past genuine success.
            generated: true,
          };
        }
      } catch (err) {
        console.error('[checkin-analysis] malformed cached aiSynthesis for check-in', latest.id, '— regenerating', err);
      }
    }

    if (!aiOutput) {
      // Coach-recorded onboarding context — built AFTER the engine has run,
      // from data the engine never sees, and passed alongside the reflections.
      // Purge-on-delete: only answers to the coach's CURRENT questions are
      // included. Empty string ⇒ the AI layer omits it entirely.
      // Bracketed question ids are included ONLY when a profile-update
      // proposal is possible (stored answers + this-week text) — the same
      // gate generateCoachOutput derives internally — so ineligible prompts
      // stay byte-identical.
      const canPropose =
        visibleAnswers(coachQuestions, clientAnswers).length > 0 &&
        Boolean(latest.clientReflection.trim() || latest.changeNote?.trim());
      const questionnaireContext = renderQuestionnaireContext(
        coachQuestions,
        clientAnswers,
        canPropose,
      );

      // Pass this week's + last week's free-text reflections as tone-only context.
      // The system prompt forbids either from overriding the Synthesis or safety
      // logic, and enables a bounded week-over-week comparison only when both exist.
      aiOutput = await generateCoachOutput(
        clientInput, synthesis, latest.clientReflection, previous.clientReflection,
        questionnaireContext,
        // This week's coach-recorded change note — latest check-in's only, by
        // design; older notes stay in history but never feed the AI.
        latest.changeNote ?? undefined,
        showMacros, draftClientMessage,
      );

      // Cache ONLY a genuine success. generateCoachOutput never throws — on any
      // failure (rate limit, timeout, bad JSON, missing key) it returns a safe
      // fallback with generated=false. We key caching on `generated`, NOT on a
      // non-empty clientMessage: with draftClientMessage off a SUCCESS has an
      // empty message and must still cache, while a failure (also empty) must
      // never persist "[AI unavailable]". The persisted JSON is an explicit
      // subset (no `generated`), so the stored shape is unchanged from before
      // this dial existed.
      if (aiOutput.generated) {
        await prisma.checkIn.update({
          where: { id: latest.id },
          data:  { aiSynthesis: JSON.stringify({
            coachSummary:            aiOutput.coachSummary,
            clientMessage:           aiOutput.clientMessage,
            attention:               aiOutput.attention,
            profileUpdateProposals:  aiOutput.profileUpdateProposals,
          }) },
        });
      }
    }

    // ---- 6. Merge the reflection attention flag into the coach's flag list --
    // appendAttentionFlag caps severity at 'warning' (see lib/attention-flag).
    // The detail view keeps the engine triage untouched — only the roster board
    // nudges triage to yellow (see app/triage/page.tsx). We also re-express the
    // on-track rationale for the FINAL warning count so the recommendation box
    // never reads "no issues" while the attention flag card is showing.
    // ---- 5b. Server-validate profile-update proposals ---------------------
    // The ONLY path proposals take to the UI: filtered to currently-visible
    // questions (deleted ⇒ dropped), unresolved on this check-in, type-valid;
    // oldValue read from the CURRENT stored snapshot — never the AI's claim,
    // never a cached copy — so the card always shows exactly what the accept
    // handler will validate against.
    const profileProposals = filterValidProposals(
      aiOutput.profileUpdateProposals,
      coachQuestions,
      clientAnswers,
      parseResolutions(latest.proposalResolutions),
    );

    const finalFlags = appendAttentionFlag(synthesis.flags, aiOutput?.attention);
    const engineWarnings = synthesis.flags.filter((f) => f.severity === 'warning').length;
    const finalWarnings  = finalFlags.filter((f) => f.severity === 'warning').length;
    const responseSynthesis = {
      ...synthesis,
      flags: finalFlags,
      recommendation: {
        ...synthesis.recommendation,
        rationale: rationaleForFinalWarnings(
          synthesis.recommendation.rationale, engineWarnings, finalWarnings,
        ),
      },
    };

    // ---- 7. Return everything the UI needs --------------------------------
    return NextResponse.json({
      clientInput,
      latestCheckInId: latest.id,
      latestCheckIn: {
        date:             latest.date,
        weight:           latest.weight,
        sleepScore:       latest.sleepScore,
        fatigueScore:     latest.fatigueScore,
        status:           latest.status,
        clientReflection: latest.clientReflection,
        changeNote:       latest.changeNote,
      },
      // The immediately-preceding check-in's weight, so the UI can show the
      // kg change across this one period. The engine consumes the previous
      // weight to fit its trend line and then discards it — Synthesis exposes
      // only `weight.latest` — so without this the browser cannot compute a
      // since-last-check-in delta. Always present: the < 2 check-ins guard
      // above means `previous` always exists.
      previousWeight: previous.weight,
      // The FIRST check-in on file (earliest by date) — powers the all-time
      // "since first check-in" context line in the UI. Display-only: the
      // engine never reads it and no verdict derives from it. Always present
      // (the >= 2 guard above). checkIns[0] is earliest — the query orders
      // ascending with an id tie-break.
      firstCheckIn: {
        date:   row.checkIns[0].date,
        weight: row.checkIns[0].weight,
      },
      synthesis: responseSynthesis,
      aiOutput,
      profileProposals,
    });

  } catch (error) {
    console.error('[checkin-analysis]', error);
    return NextResponse.json(
      { error: 'Analysis pipeline failed.' },
      { status: 500 },
    );
  }
}
