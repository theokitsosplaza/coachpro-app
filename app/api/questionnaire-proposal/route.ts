import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';
import {
  parseCoachQuestions,
  parseAnswerSet,
  parseProposals,
  parseResolutions,
  matchSelectOption,
  type AnswerSnapshot,
  type ProposalResolution,
} from '@/lib/questionnaire';

export const dynamic = 'force-dynamic'

// ===========================================================================
// POST /api/questionnaire-proposal
// ---------------------------------------------------------------------------
// Body: {
//   checkInId:        string
//   questionId:       string
//   action:           'accept' | 'dismiss'
//   expectedOldValue?: string   // accept only — the value the coach SAW
// }
//
// The proposal itself (proposedValue, evidence, source) is read from the
// check-in's cached aiSynthesis — SERVER-AUTHORITATIVE, never from the
// request body — so a forged payload cannot invent a proposal the AI never
// made. Dismiss writes ONLY a resolution. Accept revalidates everything
// against current state, then atomically: updates the stored answer snapshot,
// writes the self-contained QuestionnaireChange audit row, records the
// resolution, and clears the client's non-approved analysis caches (an
// accepted answer is an answers-write — the part-1 rule).
// ===========================================================================

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({
    where:  { authUserId: data.claims.sub },
    select: { id: true, questionnaire: true },
  });
  if (!coach) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      checkInId?: string;
      questionId?: string;
      action?: string;
      expectedOldValue?: string;
    };
    const { checkInId, questionId, action, expectedOldValue } = body;

    if (!checkInId || !questionId || (action !== 'accept' && action !== 'dismiss')) {
      return NextResponse.json(
        { error: 'Request body must include checkInId, questionId, and action ("accept" | "dismiss").' },
        { status: 400 },
      );
    }

    // ---- Ownership: session -> coach owns client -> check-in is theirs ----
    const checkIn = await prisma.checkIn.findUnique({
      where:   { id: checkInId },
      include: { client: { select: { id: true, coachId: true, questionnaireAnswers: true } } },
    });
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in not found.' }, { status: 404 });
    }
    if (checkIn.client.coachId !== coach.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ---- Idempotency: already resolved -> succeed without rewriting -------
    const resolutions = parseResolutions(checkIn.proposalResolutions);
    if (resolutions.some((r) => r.questionId === questionId)) {
      return NextResponse.json({ success: true });
    }

    const appendResolution = (kind: ProposalResolution['resolution']) =>
      [...resolutions, { questionId, resolution: kind, at: new Date().toISOString() }] as unknown as Prisma.InputJsonValue;

    // ---- Dismiss: a resolution and NOTHING else ---------------------------
    if (action === 'dismiss') {
      await prisma.checkIn.update({
        where: { id: checkInId },
        data:  { proposalResolutions: appendResolution('dismissed') },
      });
      return NextResponse.json({ success: true });
    }

    // ---- Accept: server-authoritative proposal + full revalidation --------
    // The proposal must exist in THIS check-in's cached analysis.
    let proposal = null;
    if (checkIn.aiSynthesis) {
      try {
        const cached = JSON.parse(checkIn.aiSynthesis) as Record<string, unknown>;
        proposal = parseProposals(cached.profileUpdateProposals)
          .find((p) => p.questionId === questionId) ?? null;
      } catch { /* malformed cache -> treated as no proposal */ }
    }
    if (!proposal) {
      return NextResponse.json(
        { error: 'This proposal is no longer part of the analysis — reopen the check-in and try again.' },
        { status: 409 },
      );
    }

    const questions = parseCoachQuestions(coach.questionnaire);
    const question  = questions.find((q) => q.id === questionId);
    const answerSet = parseAnswerSet(checkIn.client.questionnaireAnswers);
    const stored    = answerSet?.answers.find((a) => a.questionId === questionId);

    // Question deleted (or answer gone) since the proposal was generated:
    // record a dismissal so it never resurfaces, write nothing else.
    if (!question || !stored) {
      await prisma.checkIn.update({
        where: { id: checkInId },
        data:  { proposalResolutions: appendResolution('dismissed') },
      });
      return NextResponse.json(
        { error: 'That question no longer exists in your questionnaire — the proposal was dismissed.' },
        { status: 409 },
      );
    }

    // Stored value changed since the coach saw the card (the card's oldValue
    // is always read from the live snapshot — this guards the race).
    if (typeof expectedOldValue === 'string' && stored.value !== expectedOldValue) {
      return NextResponse.json(
        { error: 'The stored answer changed since this was proposed — reopen the check-in to see the current value.' },
        { status: 409 },
      );
    }

    // Type validity against the CURRENT question definition. Select matching
    // is the same case-tolerant EXACT rule the display filter uses
    // (matchSelectOption) — the value written on accept is always the
    // canonical stored casing.
    let acceptedValue = proposal.proposedValue;
    if (question.type === 'select') {
      const canonical = matchSelectOption(question, proposal.proposedValue);
      if (!canonical) {
        return NextResponse.json(
          { error: 'The proposed value is not one of this question\'s options anymore.' },
          { status: 409 },
        );
      }
      acceptedValue = canonical;
    }
    if (question.type === 'number' && Number.isNaN(Number(acceptedValue))) {
      return NextResponse.json(
        { error: 'The proposed value is not a valid number.' },
        { status: 409 },
      );
    }

    // ---- Atomic accept ----------------------------------------------------
    const newSnapshot: AnswerSnapshot = {
      questionId,
      label: question.label, // current label — this is what the coach accepted
      type:  question.type,
      value: acceptedValue,
    };
    const updatedAnswers = {
      answeredAt: new Date().toISOString(),
      answers: (answerSet?.answers ?? []).map((a) =>
        a.questionId === questionId ? newSnapshot : a,
      ),
    };

    await prisma.$transaction([
      prisma.client.update({
        where: { id: checkIn.client.id },
        data:  { questionnaireAnswers: updatedAnswers as unknown as Prisma.InputJsonValue },
      }),
      prisma.questionnaireChange.create({
        data: {
          clientId:      checkIn.client.id,
          checkInId:     checkIn.id,
          checkInDate:   checkIn.date,
          questionId,
          questionLabel: question.label,
          oldValue:      stored.value,
          newValue:      acceptedValue,
          evidence:      proposal.evidence,
          source:        proposal.source,
        },
      }),
      prisma.checkIn.update({
        where: { id: checkInId },
        data:  { proposalResolutions: appendResolution('accepted') },
      }),
      // An accepted answer changes the AI's background context — clear the
      // client's non-approved caches so pending analyses regenerate with it
      // (the established answers-write rule). Approved history stays frozen.
      prisma.checkIn.updateMany({
        where: { clientId: checkIn.client.id, status: { not: CHECK_IN_STATUS.Approved } },
        data:  { aiSynthesis: null },
      }),
    ]);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[questionnaire-proposal]', err);
    return NextResponse.json(
      { error: 'Failed to process the proposal.' },
      { status: 500 },
    );
  }
}
