import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// ===========================================================================
// GET /api/seed-demo
// ---------------------------------------------------------------------------
// Idempotent: safe to call many times. Each call wipes Maria's existing
// check-ins and re-creates exactly four, so the data is always in a clean,
// known state for /api/test-synthesis.
//
// Prerequisites: at least one Coach row must already exist (created via
// GET /api/seed). The route returns a clear error if none is found.
// ===========================================================================

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    // ---- 1. Find the first coach --------------------------------------------
    // We need a coachId to create the demo client. If no coach row exists yet,
    // tell the caller to hit /api/seed first.
    const coach = await prisma.coach.findFirst();

    if (!coach) {
      return NextResponse.json(
        { error: 'No Coach record found. Run GET /api/seed first to create one.' },
        { status: 400 },
      );
    }

    // ---- 2. Find or create the demo client ----------------------------------
    // We scope the lookup to this coach so a future multi-coach setup stays safe.
    let demo = await prisma.client.findFirst({
      where: { coachId: coach.id, name: 'Demo — Maria' },
    });

    if (!demo) {
      demo = await prisma.client.create({
        data: {
          coachId:       coach.id,
          name:          'Demo — Maria',
          goal:          'fat loss',
          currentPhase:  'Cut',
          targetProtein: 180,
          targetCarbs:   200,
          targetFats:    60,
        },
      });
    }

    // ---- 3. Wipe any existing check-ins for this client --------------------
    // Deleting before re-creating means re-running the route never duplicates
    // rows, which keeps test-synthesis results deterministic.
    await prisma.checkIn.deleteMany({ where: { clientId: demo.id } });

    // ---- 4. Create exactly 4 check-in rows ----------------------------------
    // Dates are computed relative to "now" so the 28-day trend window in the
    // engine always covers all four points regardless of when this runs.
    const daysAgo = (n: number): Date =>
      new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    await prisma.checkIn.createMany({
      data: [
        {
          clientId:      demo.id,
          date:          daysAgo(21),
          weight:        70.0,
          sleepScore:    7,
          fatigueScore:  4,
          loggedProtein: 178,
          loggedCarbs:   198,
          loggedFats:    59,
          status:        'pending',
          aiSynthesis:   null,
        },
        {
          clientId:      demo.id,
          date:          daysAgo(14),
          weight:        69.9,
          sleepScore:    7,
          fatigueScore:  4,
          loggedProtein: 182,
          loggedCarbs:   201,
          loggedFats:    61,
          status:        'pending',
          aiSynthesis:   null,
        },
        {
          clientId:      demo.id,
          date:          daysAgo(7),
          weight:        70.0,
          sleepScore:    7,
          fatigueScore:  5,
          loggedProtein: 179,
          loggedCarbs:   199,
          loggedFats:    60,
          status:        'pending',
          aiSynthesis:   null,
        },
        {
          clientId:      demo.id,
          date:          daysAgo(0),   // "now"
          weight:        70.0,
          sleepScore:    6,
          fatigueScore:  5,
          loggedProtein: 181,
          loggedCarbs:   200,
          loggedFats:    60,
          status:        'pending',
          aiSynthesis:   null,
        },
      ],
    });

    // ---- 5. Confirm success -------------------------------------------------
    return NextResponse.json({
      message:       'Demo data seeded successfully.',
      clientId:      demo.id,
      clientName:    demo.name,
      checkInsCreated: 4,
    });

  } catch (error) {
    console.error('[seed-demo]', error);
    return NextResponse.json(
      { error: 'Failed to seed demo data.', detail: String(error) },
      { status: 500 },
    );
  }
}
