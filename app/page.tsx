import { prisma } from "@/lib/prisma";
import { analyzeClient, type ClientInput, type CheckInInput } from "@/lib/coach-engine";
import { OVERDUE_DAYS } from "@/lib/triage-constants";
import { DashboardClient, type DashboardData, type AttentionClient } from "./DashboardClient";
import { CHECK_IN_STATUS } from "@/lib/check-in-status";
import { verifyCoachSession } from "@/lib/dal";

function daysSince(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function DashboardPage() {
  await verifyCoachSession();

  // ── 1. All clients + check-ins (for triage engine) ────────────────────────
  const clients = await prisma.client.findMany({
    include: { checkIns: { orderBy: { date: "asc" } } },
  });

  // ── 2. Triage — same algorithm as app/triage/page.tsx ────────────────────
  const attentionClients: AttentionClient[] = [];
  let onTrackCount = 0;

  for (const c of clients) {
    if (!c.checkIns.length) { onTrackCount++; continue; }

    const latest = c.checkIns[c.checkIns.length - 1];
    const days = daysSince(new Date(latest.date));

    if (days > OVERDUE_DAYS) {
      attentionClients.push({
        id: c.id,
        name: c.name,
        triage: "red",
        headline: `Overdue — last check-in ${days} days ago.`,
        daysSinceLastCheckIn: days,
      });
      continue;
    }

    const clientInput: ClientInput = {
      id: c.id, name: c.name, goal: c.goal, currentPhase: c.currentPhase,
      targetProtein: c.targetProtein, targetCarbs: c.targetCarbs, targetFats: c.targetFats,
    };
    const checkInInputs: CheckInInput[] = c.checkIns.map((ci: (typeof c.checkIns)[number]) => ({
      id: ci.id, date: ci.date, weight: ci.weight, sleepScore: ci.sleepScore,
      fatigueScore: ci.fatigueScore, loggedProtein: ci.loggedProtein,
      loggedCarbs: ci.loggedCarbs, loggedFats: ci.loggedFats,
      cycleAffected: ci.cycleAffected,
    }));
    const synthesis = analyzeClient(clientInput, checkInInputs);

    if (synthesis.triage === "red" || synthesis.triage === "yellow") {
      attentionClients.push({
        id: c.id, name: c.name, triage: synthesis.triage,
        headline: synthesis.recommendation.headline,
        daysSinceLastCheckIn: days,
      });
    } else {
      onTrackCount++;
    }
  }

  attentionClients.sort((a, b) => (a.triage === "red" ? 0 : 1) - (b.triage === "red" ? 0 : 1));

  // ── 3. Macro compliance (avg calorie adherence, last 7 days) ─────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const complianceRows = await prisma.checkIn.findMany({
    where: { date: { gte: sevenDaysAgo } },
    include: {
      client: { select: { targetProtein: true, targetCarbs: true, targetFats: true } },
    },
  });
  const macroCompliancePct =
    complianceRows.length === 0
      ? null
      : Math.round(
          (complianceRows.reduce((sum, ci) => {
            const targetKcal =
              ci.client.targetProtein * 4 + ci.client.targetCarbs * 4 + ci.client.targetFats * 9;
            const loggedKcal =
              ci.loggedProtein * 4 + ci.loggedCarbs * 4 + ci.loggedFats * 9;
            return sum + (targetKcal > 0 ? loggedKcal / targetKcal : 1);
          }, 0) / complianceRows.length) * 100
        );

  // ── 4. Check-in pulse (current week Mon–Sun) ──────────────────────────────
  const now = new Date();
  const dow = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));

  const weekCheckIns = await prisma.checkIn.findMany({
    where: { date: { gte: monday } },
    select: { date: true },
  });
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayCounts = new Array(7).fill(0) as number[];
  for (const ci of weekCheckIns) {
    const d = new Date(ci.date).getDay();
    dayCounts[d === 0 ? 6 : d - 1]++;
  }
  const todayIdx = dow === 0 ? 6 : dow - 1;
  const checkInBars = DAYS.map((day, i) => ({ day, count: dayCounts[i], isToday: i === todayIdx }));

  // ── 5. Recent check-ins (last 5) ──────────────────────────────────────────
  const recentRaw = await prisma.checkIn.findMany({
    orderBy: { date: "desc" },
    take: 5,
    include: { client: { select: { id: true, name: true } } },
  });
  const recentCheckIns = recentRaw.map((ci: (typeof recentRaw)[number]) => ({
    checkInId: ci.id,
    id: ci.client.id,
    name: ci.client.name,
    initials: toInitials(ci.client.name),
    time: new Date(ci.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    status: (ci.status === CHECK_IN_STATUS.Approved ? "on_track" : "pending_review") as
      "on_track" | "pending_review" | "action_needed",
  }));

  const data: DashboardData = {
    totalClients: clients.length,
    attentionClients,
    onTrackCount,
    macroCompliancePct,
    recentCheckIns,
    checkInBars,
  };

  return <DashboardClient data={data} />;
}
