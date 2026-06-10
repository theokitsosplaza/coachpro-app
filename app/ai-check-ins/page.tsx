// Server component — fetches the client queue from the database and passes it
// to the interactive client component. No "use client" here so the DB call
// happens on the server with no waterfall on page load.

import { prisma } from '@/lib/prisma';
import { AICheckInsClient, type QueueClientData } from './AICheckInsClient';
import { verifyCoachSession } from '@/lib/dal';
import { CHECK_IN_STATUS } from '@/lib/check-in-status';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AICheckInsPage() {
  await verifyCoachSession();

  let queueClients: QueueClientData[] = [];

  try {
    // Fetch all clients. For each, grab only their most-recent check-in so
    // we can show the submission time and status in the queue sidebar.
    const clients = await prisma.client.findMany({
      where: { archivedAt: null },
      include: {
        checkIns: { orderBy: { date: 'desc' }, take: 1 },
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
          };
          savedAnalysis = {
            checkInId:     latest.id,
            coachSummary:  parsed.coachSummary  ?? '',
            clientMessage: parsed.clientMessage ?? '',
            macros: {
              protein: c.targetProtein,
              carbs:   c.targetCarbs,
              fats:    c.targetFats,
            },
            approvedAt: new Date(latest.date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            }),
          };
        } catch {
          savedAnalysis = null;
        }
      }

      return {
        id:          c.id,
        name:        c.name,
        initials:    initials(c.name),
        submittedAt: latest
          ? new Date(latest.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : null,
        status:       (latest?.status ?? 'none') as string,
        savedAnalysis,
      };
    });
  } catch (err) {
    // If the DB is unreachable (e.g. dev without a local Postgres), render
    // with an empty queue rather than crashing the entire page.
    console.error('[ai-check-ins page] DB error — rendering empty queue:', err);
  }

  return <AICheckInsClient queueClients={queueClients} />;
}
