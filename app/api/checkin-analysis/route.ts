import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeClient, type ClientInput, type CheckInInput } from '@/lib/coach-engine';
import { generateCoachOutput } from '@/lib/ai-coach';
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
    select: { id: true },
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
      include: { checkIns: { orderBy: { date: 'asc' } } },
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
    if (row.checkIns.length < 2) {
      return NextResponse.json(
        {
          error:
            `${row.name} has only ${row.checkIns.length} check-in(s). ` +
            'At least 2 are required to compute a reliable trend. ' +
            'Run GET /api/seed-demo to populate demo data.',
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

    // ---- 4. Run the deterministic engine ----------------------------------
    const synthesis = analyzeClient(clientInput, checkInInputs);

    // ---- 5. Run the AI narrative layer ------------------------------------
    // generateCoachOutput never throws — errors return a safe fallback object.
    const aiOutput = await generateCoachOutput(clientInput, synthesis);

    // ---- 6. Return everything the UI needs --------------------------------
    return NextResponse.json({
      clientInput,
      latestCheckInId: latest.id,
      latestCheckIn: {
        date:         latest.date,
        weight:       latest.weight,
        sleepScore:   latest.sleepScore,
        fatigueScore: latest.fatigueScore,
        status:       latest.status,
      },
      synthesis,
      aiOutput,
    });

  } catch (error) {
    console.error('[checkin-analysis]', error);
    return NextResponse.json(
      { error: 'Analysis pipeline failed.', detail: String(error) },
      { status: 500 },
    );
  }
}
