import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const coach = await prisma.coach.create({
      data: {
        email: "coach@coachpro.com",
        name: "Head Coach",
      }
    });

    await prisma.client.createMany({
      data: [
        {
          coachId: coach.id,
          name: "James Mitchell",
          goal: "Hypertrophy",
          currentPhase: "Meso 1: Accumulation",
          targetProtein: 180,
          targetCarbs: 350,
          targetFats: 75,
        },
        {
          coachId: coach.id,
          name: "Priya Sharma",
          goal: "Fat Loss",
          currentPhase: "Cutting Phase 2",
          targetProtein: 140,
          targetCarbs: 150,
          targetFats: 50,
        }
      ]
    });

    return NextResponse.json({ message: "SUCCESS: Database seeded perfectly!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to seed database." }, { status: 500 });
  }
}