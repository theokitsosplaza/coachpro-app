import { verifyClientSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export default async function PortalPage() {
  const client = await verifyClientSession()

  const [checkIns, latestMacros] = await Promise.all([
    prisma.checkIn.findMany({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        id: true,
        date: true,
        weight: true,
        sleepScore: true,
        fatigueScore: true,
        loggedProtein: true,
        loggedCarbs: true,
        loggedFats: true,
        status: true,
      },
    }),
    prisma.macroHistory.findFirst({
      where: { clientId: client.id },
      orderBy: { changedAt: 'desc' },
      select: { protein: true, carbs: true, fats: true, changedAt: true },
    }),
  ])

  const macroTiles = [
    { label: 'Protein', value: client.targetProtein },
    { label: 'Carbs',   value: client.targetCarbs },
    { label: 'Fats',    value: client.targetFats },
    ...(client.targetFiber != null
      ? [{ label: 'Fiber', value: client.targetFiber }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {client.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {client.currentPhase} · {client.goal}
        </p>
      </div>

      <section
        className="rounded-2xl border border-border-strong bg-surface-2 p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Targets
        </h2>
        <div
          className={`grid gap-3 ${macroTiles.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}
        >
          {macroTiles.map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-3 px-3 py-3 text-center">
              <p className="text-xl font-bold tabular-nums text-foreground">
                {value}
                <span className="ml-0.5 text-xs font-medium text-muted-foreground">g</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {latestMacros && (
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated{' '}
            {latestMacros.changedAt.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Check-ins
        </h2>
        {checkIns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check-in submission is coming soon.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border border-border-strong bg-surface-2"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Weight
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Sleep
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Fatigue
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {checkIns.map((ci) => (
                  <tr key={ci.id} className="transition-colors hover:bg-surface-3/50">
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {ci.date.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {ci.weight} kg
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {ci.sleepScore}/10
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {ci.fatigueScore}/10
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {ci.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
