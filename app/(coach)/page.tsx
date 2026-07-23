import { prisma } from "@/lib/prisma";
import { analyzeClient, type ClientInput, type CheckInInput } from "@/lib/coach-engine";
import { OVERDUE_DAYS } from "@/lib/triage-constants";
import { DashboardClient, type DashboardData, type AttentionClient } from "./DashboardClient";
import { CHECK_IN_STATUS } from "@/lib/check-in-status";
import { verifyCoachSession } from "@/lib/dal";
import { mergeCoachConfig } from "@/lib/coach-config";

function daysSince(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// Server components read the clock once per request. Isolating the impure
// Date.now() read in a helper keeps the pure-render lint rule (react-hooks/
// purity) satisfied, the same way daysSince() above does.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function DashboardPage() {
  const coach = await verifyCoachSession();
  const { showMacros } = mergeCoachConfig(coach.config);

  // ── 1. All clients + check-ins (for triage engine) ────────────────────────
  const clients = await prisma.client.findMany({
    where: { coachId: coach.id, archivedAt: null },
    include: { checkIns: { orderBy: [{ date: "asc" }, { id: "asc" }] } },
  });

  // ── 2. Triage — same algorithm as app/triage/page.tsx, with one known gap:
  // that page also nudges triage to yellow off a cached AI attention flag, which
  // is not replicated here, so a flagged client can read yellow there and
  // on-track here. Closing it means sharing one classifier between the two.
  //                                                                    ────────
  const attentionClients: AttentionClient[] = [];
  let onTrackCount = 0;
  // Clients the engine has no verdict on yet. Kept separate from onTrackCount:
  // "grey" means not enough data (see Triage in lib/coach-engine), which is not
  // the same claim as "on track with no flags". Folding the two together made
  // this page contradict the Triage board, which files them under "No Data".
  let noDataCount = 0;

  for (const c of clients) {
    if (!c.checkIns.length) { noDataCount++; continue; }

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
    } else if (synthesis.triage === "grey") {
      noDataCount++;
    } else {
      onTrackCount++;
    }
  }

  attentionClients.sort((a, b) => (a.triage === "red" ? 0 : 1) - (b.triage === "red" ? 0 : 1));

  // ── 3. Macro compliance (avg calorie adherence, last 7 days) ─────────────
  const sevenDaysAgo = daysAgo(7);
  const complianceRows = await prisma.checkIn.findMany({
    where: { date: { gte: sevenDaysAgo }, client: { coachId: coach.id, archivedAt: null } },
    include: {
      client: { select: { targetProtein: true, targetCarbs: true, targetFats: true } },
    },
  });
  // Exclude check-ins from clients with no macro plan (zero targets) so they
  // don't inflate the average by being counted as 100% compliant.
  const planRows = complianceRows.filter((ci) =>
    ci.client.targetProtein * 4 + ci.client.targetCarbs * 4 + ci.client.targetFats * 9 > 0
  );
  const macroCompliancePct =
    planRows.length === 0
      ? null
      : Math.round(
          (planRows.reduce((sum, ci) => {
            const targetKcal =
              ci.client.targetProtein * 4 + ci.client.targetCarbs * 4 + ci.client.targetFats * 9;
            const loggedKcal =
              ci.loggedProtein * 4 + ci.loggedCarbs * 4 + ci.loggedFats * 9;
            return sum + loggedKcal / targetKcal;
          }, 0) / planRows.length) * 100
        );

  // ── 4. Check-in pulse (current week Mon–Sun) ──────────────────────────────
  const now = new Date();
  const dow = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));

  const weekCheckIns = await prisma.checkIn.findMany({
    where: { date: { gte: monday }, client: { coachId: coach.id, archivedAt: null } },
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

  // ── 5. Recent check-ins (one per client, up to 5, most-recent first) ────────
  // Derived from the clients already fetched above — no extra DB query.
  // Each client contributes at most one row (its latest check-in), so the same
  // client can never appear twice.
  const recentCheckIns = clients
    .filter((c) => c.checkIns.length > 0)
    .map((c) => {
      const latest = c.checkIns[c.checkIns.length - 1]; // checkIns ordered asc
      return {
        checkInId: latest.id,
        id: c.id,
        name: c.name,
        initials: toInitials(c.name),
        time: latest.date.toISOString(),
        status: (latest.status === CHECK_IN_STATUS.Approved ? "on_track" : "pending_review") as
          "on_track" | "pending_review" | "action_needed",
      };
    })
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5);

  const data: DashboardData = {
    coachName: coach.name ?? '',
    totalClients: clients.length,
    attentionClients,
    onTrackCount,
    noDataCount,
    macroCompliancePct,
    recentCheckIns,
    checkInBars,
  };

  return <DashboardClient data={data} showMacros={showMacros} />;
}
