import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeClient, type ClientInput, type CheckInInput } from '@/lib/coach-engine';
import { generateCoachOutput } from '@/lib/ai-coach';
import { createClient } from '@/lib/supabase/server';

// ===========================================================================
// GET /api/test-synthesis
// ---------------------------------------------------------------------------
// Runs the full pipeline end-to-end and returns every intermediate result so
// you can inspect the engine verdict and the AI-written messages side by side
// in your browser — no UI needed.
//
// Prerequisites: run GET /api/seed-demo first. The route returns a clear
// instruction if "Demo — Maria" is missing or has fewer than 2 check-ins
// (the engine's minimum to compute a reliable trend).
// ===========================================================================

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    // ---- 1. Load the demo client with her check-ins ------------------------
    // We order ascending so the engine's least-squares weight trend reads the
    // data in chronological order, matching analyzeClient()'s expectations.
    const row = await prisma.client.findFirst({
      where: { name: 'Demo — Maria' },
      include: {
        checkIns: { orderBy: { date: 'asc' } },
      },
    });

    // Guard: seed-demo must run first.
    if (!row) {
      return NextResponse.json(
        { message: 'Client "Demo — Maria" not found. Open /api/seed-demo first.' },
        { status: 400 },
      );
    }

    // Guard: the engine needs at least 2 check-ins to compute a trend.
    if (row.checkIns.length < 2) {
      return NextResponse.json(
        {
          message:
            `"Demo — Maria" has only ${row.checkIns.length} check-in(s). ` +
            'Open /api/seed-demo to create the full set of 4.',
        },
        { status: 400 },
      );
    }

    // ---- 2. Map DB rows → engine input shapes ------------------------------
    // ClientInput and CheckInInput field names are identical to the Prisma
    // schema, so this is a direct pick with no renaming required.
    const clientInput: ClientInput = {
      id:            row.id,
      name:          row.name,
      goal:          row.goal,
      currentPhase:  row.currentPhase,
      targetProtein: row.targetProtein,
      targetCarbs:   row.targetCarbs,
      targetFats:    row.targetFats,
    };

    const checkInInputs: CheckInInput[] = row.checkIns.map((c) => ({
      id:            c.id,
      date:          c.date,
      weight:        c.weight,
      sleepScore:    c.sleepScore,
      fatigueScore:  c.fatigueScore,
      loggedProtein: c.loggedProtein,
      loggedCarbs:   c.loggedCarbs,
      loggedFats:    c.loggedFats,
    }));

    // ---- 3. Run the deterministic engine ------------------------------------
    // analyzeClient() does 100% of the math — no AI involved at this step.
    // It reads the check-ins, computes the weight trend, checks adherence,
    // fires any safety brakes, and produces a structured Synthesis object.
    const synthesis = analyzeClient(clientInput, checkInInputs);

    // ---- 4. Run the AI narrative layer -------------------------------------
    // generateCoachOutput() reads the Synthesis as the source of truth and
    // asks Claude to write two human-readable fields: a coach summary and a
    // ready-to-send client message. It never crashes — errors return a
    // safe fallback so this route always completes.
    const aiOutput = await generateCoachOutput(clientInput, synthesis);

    // ---- 5. Return everything side by side ---------------------------------
    return NextResponse.json({
      client:    clientInput.name,
      synthesis,
      aiOutput,
    });

  } catch (error) {
    console.error('[test-synthesis]', error);
    return NextResponse.json(
      { error: 'Pipeline failed.', detail: String(error) },
      { status: 500 },
    );
  }
}
