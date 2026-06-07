import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 

export async function GET() {
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