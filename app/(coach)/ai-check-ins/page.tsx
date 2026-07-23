// Server component — fetches the client queue from the database and passes it
// to the interactive client component. No "use client" here so the DB call
// happens on the server with no waterfall on page load.

import { prisma } from '@/lib/prisma';
import { AICheckInsClient, type QueueClientData } from './AICheckInsClient';
import { verifyCoachSession } from '@/lib/dal';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';
import { parseAttentionSignal } from '@/lib/attention-flag';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AICheckInsPage() {
  const coach = await verifyCoachSession();

  let queueClients: QueueClientData[] = [];

  try {
    // Fetch all clients. For each, grab only their most-recent check-in so
    // we can show the submission time and status in the queue sidebar.
    const clients = await prisma.client.findMany({
      where: { coachId: coach.id, archivedAt: null },
      include: {
        checkIns: { orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    queueClients = clients.map((c: (typeof clients)[number]) => {
      const latest = c.checkIns[0] ?? null;

      let savedAnalysis: QueueClientData['savedAnalysis'] = null;
      if (latest?.status === CHECK_IN_STATUS.Approved && latest.aiSynthesis) {
        try {
          const parsed = JSON.parse(latest.aiSynthesis) as {
            coachSummary?: string;
            clientMessage?: string;
            attention?: unknown;
          };
          savedAnalysis = {
            checkInId:        latest.id,
            coachSummary:     parsed.coachSummary  ?? '',
            clientMessage:    parsed.clientMessage ?? '',
            clientReflection: latest.clientReflection,
            macros: {
              protein: c.targetProtein,
              carbs:   c.targetCarbs,
              fats:    c.targetFats,
            },
            approvedAt: new Date(latest.date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            }),
            attention: parseAttentionSignal(parsed.attention),
          };
        } catch (err) {
          console.error('[ai-check-ins] malformed aiSynthesis for check-in', latest.id, err);
          savedAnalysis = null;
        }
      }

      return {
        id:          c.id,
        name:        c.name,
        initials:    initials(c.name),
        submittedAt: latest ? latest.date.toISOString() : null,
        status:       (latest?.status ?? 'none') as QueueClientData['status'],
        savedAnalysis,
      };
    }).sort((a, b) => {
      // Priority: Pending (0) → Approved (1) → no submission (2)
      const rank = (s: QueueClientData['status']) =>
        s === CHECK_IN_STATUS.Pending ? 0 : s === CHECK_IN_STATUS.Approved ? 1 : 2;
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      // Within pending: oldest first so nothing waits too long
      // Within approved: newest first (most recently handled)
      // Within none: no submittedAt — DB name order (asc) preserved as tiebreaker
      if (a.submittedAt && b.submittedAt) {
        return rank(a.status) === 0
          ? a.submittedAt.localeCompare(b.submittedAt)  // pending: asc
          : b.submittedAt.localeCompare(a.submittedAt); // approved: desc
      }
      return 0;
    });
  } catch (err) {
    // If the DB is unreachable (e.g. dev without a local Postgres), render
    // with an empty queue rather than crashing the entire page.
    console.error('[ai-check-ins page] DB error — rendering empty queue:', err);
  }

  return <AICheckInsClient queueClients={queueClients} />;
}
