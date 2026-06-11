// Server component — runs the engine for every client and passes triage
// results to the interactive board. No "use client" so DB + engine run
// server-side with no client waterfall.

import { prisma } from '@/lib/prisma';
import { analyzeClient, type ClientInput, type CheckInInput, type Triage } from '@/lib/coach-engine';
import { TriageBoardClient, type TriageClientRow } from './TriageBoardClient';
import { OVERDUE_DAYS, TRIAGE_ORDER } from '@/lib/triage-constants';
import { verifyCoachSession } from '@/lib/dal';

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function TriagePage() {
  const coach = await verifyCoachSession();

  let rows: TriageClientRow[] = [];

  try {
    const clients = await prisma.client.findMany({
      where: { coachId: coach.id, archivedAt: null },
      include: {
        checkIns: { orderBy: { date: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    rows = clients.map((c: (typeof clients)[number]) => {
      const hasCheckIns = c.checkIns.length > 0;

      // ── Grey: never submitted ──────────────────────────────────────────────
      if (!hasCheckIns) {
        return {
          id: c.id,
          name: c.name,
          initials: initials(c.name),
          goal: c.goal,
          currentPhase: c.currentPhase,
          triage: 'grey' as Triage,
          daysSinceLastCheckIn: null,
          headline: 'No check-in yet.',
        };
      }

      const latest = c.checkIns[c.checkIns.length - 1];
      const days = daysSince(new Date(latest.date));

      // ── Red: overdue ───────────────────────────────────────────────────────
      if (days > OVERDUE_DAYS) {
        return {
          id: c.id,
          name: c.name,
          initials: initials(c.name),
          goal: c.goal,
          currentPhase: c.currentPhase,
          triage: 'red' as Triage,
          daysSinceLastCheckIn: days,
          headline: `Overdue — last check-in ${days} days ago.`,
        };
      }

      // ── Run the engine ─────────────────────────────────────────────────────
      const clientInput: ClientInput = {
        id: c.id,
        name: c.name,
        goal: c.goal,
        currentPhase: c.currentPhase,
        targetProtein: c.targetProtein,
        targetCarbs: c.targetCarbs,
        targetFats: c.targetFats,
      };

      const checkInInputs: CheckInInput[] = c.checkIns.map((ci: (typeof c.checkIns)[number]) => ({
        id: ci.id,
        date: ci.date,
        weight: ci.weight,
        sleepScore: ci.sleepScore,
        fatigueScore: ci.fatigueScore,
        loggedProtein: ci.loggedProtein,
        loggedCarbs: ci.loggedCarbs,
        loggedFats: ci.loggedFats,
        cycleAffected: ci.cycleAffected,
      }));

      const synthesis = analyzeClient(clientInput, checkInInputs);

      return {
        id: c.id,
        name: c.name,
        initials: initials(c.name),
        goal: c.goal,
        currentPhase: c.currentPhase,
        triage: synthesis.triage,
        daysSinceLastCheckIn: days,
        headline: synthesis.recommendation.headline,
      };
    });

    // Sort: red → yellow → green → grey
    rows.sort((a, b) => TRIAGE_ORDER[a.triage] - TRIAGE_ORDER[b.triage]);
  } catch (err) {
    console.error('[triage page] DB error:', err);
  }

  return <TriageBoardClient rows={rows} />;
}
