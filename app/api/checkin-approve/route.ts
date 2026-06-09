import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';

export const dynamic = 'force-dynamic'

// ===========================================================================
// POST /api/checkin-approve
// ---------------------------------------------------------------------------
// Body: { checkInId: string, coachSummary: string, clientMessage: string }
//
// Stamps the CheckIn row as "approved" and persists both AI-generated text
// fields as a JSON string in the aiSynthesis column. Safe to call once per
// check-in — repeated calls simply overwrite with the same data.
// ===========================================================================

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ---- 1. Parse and validate the request body --------------------------
    const body = await request.json() as {
      checkInId?: string;
      coachSummary?: string;
      clientMessage?: string;
    };

    const { checkInId, coachSummary, clientMessage } = body;

    if (!checkInId || !coachSummary) {
      return NextResponse.json(
        { error: 'Request body must include checkInId and coachSummary.' },
        { status: 400 },
      );
    }

    // ---- 2. Confirm the check-in exists ----------------------------------
    const existing = await prisma.checkIn.findUnique({ where: { id: checkInId } });
    if (!existing) {
      return NextResponse.json(
        { error: `CheckIn "${checkInId}" not found.` },
        { status: 404 },
      );
    }

    // ---- 3. Persist the approval ----------------------------------------
    // aiSynthesis stores both text fields as JSON so we can reconstruct them
    // later without adding extra columns to the schema.
    await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        aiSynthesis: JSON.stringify({
          coachSummary,
          clientMessage: clientMessage ?? '',
        }),
        status: CHECK_IN_STATUS.Approved,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[checkin-approve]', error);
    return NextResponse.json(
      { error: 'Failed to approve check-in.', detail: String(error) },
      { status: 500 },
    );
  }
}
