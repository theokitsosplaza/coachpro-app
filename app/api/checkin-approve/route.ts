import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';

export const dynamic = 'force-dynamic'

// ===========================================================================
// POST /api/checkin-approve
// ---------------------------------------------------------------------------
// Body: {
//   checkInId:       string
//   coachSummary:    string
//   clientMessage?:  string
//   confirmedMacros?: { protein: number; carbs: number; fats: number } | null
// }
//
// Stamps the CheckIn as Approved, saves the AI text, and — when
// confirmedMacros is supplied — updates the Client's macro targets and
// writes a MacroHistory record. All three writes are atomic.
// ===========================================================================

export async function POST(request: Request) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Resolve coach row (confirms caller is actually a coach) ───────────
  const coach = await prisma.coach.findUnique({
    where:  { authUserId: data.claims.sub },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ── 3. Parse and validate body ─────────────────────────────────────────
    const body = await request.json() as {
      checkInId?:       string;
      coachSummary?:    string;
      clientMessage?:   string;
      confirmedMacros?: { protein: number; carbs: number; fats: number } | null;
    };

    const { checkInId, coachSummary, clientMessage, confirmedMacros } = body;

    if (!checkInId || !coachSummary) {
      return NextResponse.json(
        { error: 'Request body must include checkInId and coachSummary.' },
        { status: 400 },
      );
    }

    if (confirmedMacros != null) {
      const { protein, carbs, fats } = confirmedMacros;
      const invalid = (v: unknown) =>
        typeof v !== 'number' || !Number.isFinite(v) || v < 0;
      if (invalid(protein) || invalid(carbs) || invalid(fats)) {
        return NextResponse.json(
          { error: 'confirmedMacros values must be non-negative finite numbers.' },
          { status: 400 },
        );
      }
    }

    // ── 4. Load check-in and verify coach owns this client ─────────────────
    const existing = await prisma.checkIn.findUnique({
      where:   { id: checkInId },
      include: { client: { select: { id: true, coachId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `CheckIn "${checkInId}" not found.` },
        { status: 404 },
      );
    }

    if (existing.client.coachId !== coach.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 5. Idempotency guard ───────────────────────────────────────────────
    if (existing.status === CHECK_IN_STATUS.Approved) {
      return NextResponse.json({ success: true });
    }

    // ── 6. Atomic writes ───────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // Always: mark check-in approved and persist AI text
      await tx.checkIn.update({
        where: { id: checkInId },
        data: {
          aiSynthesis: JSON.stringify({
            coachSummary,
            clientMessage: clientMessage ?? '',
          }),
          status: CHECK_IN_STATUS.Approved,
        },
      });

      // Only when the coach confirmed macro targets
      if (confirmedMacros != null) {
        await tx.client.update({
          where: { id: existing.clientId },
          data: {
            targetProtein: Math.round(confirmedMacros.protein),
            targetCarbs:   Math.round(confirmedMacros.carbs),
            targetFats:    Math.round(confirmedMacros.fats),
          },
        });

        await tx.macroHistory.create({
          data: {
            clientId:     existing.clientId,
            protein:      Math.round(confirmedMacros.protein),
            carbs:        Math.round(confirmedMacros.carbs),
            fats:         Math.round(confirmedMacros.fats),
            changeReason: 'Coach approval — AI check-in analysis',
          },
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[checkin-approve]', err);
    return NextResponse.json(
      { error: 'Failed to approve check-in.' },
      { status: 500 },
    );
  }
}
