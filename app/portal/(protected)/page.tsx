import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { verifyClientSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

// ── Weight trend chart (server-rendered SVG) ──────────────────────────────────

function formatChartDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const C_W = 600
const C_H = 160
const C_PAD = { top: 16, right: 16, bottom: 32, left: 52 }
const C_CW = C_W - C_PAD.left - C_PAD.right
const C_CH = C_H - C_PAD.top - C_PAD.bottom

function WeightChart({ checkIns }: { checkIns: Array<{ date: Date; weight: number }> }) {
  if (checkIns.length === 0) return null

  const sorted = [...checkIns].sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sorted.length === 1) {
    return (
      <section
        className="rounded-2xl border border-border-strong bg-surface-2 p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Weight Trend
        </p>
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Need at least 2 check-ins to show your trend.
        </div>
      </section>
    )
  }

  const weights = sorted.map((c) => c.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 2
  const yMin = minW - range * 0.15
  const yMax = maxW + range * 0.15
  const n = sorted.length

  const xAt = (i: number) => C_PAD.left + (i / (n - 1)) * C_CW
  const yAt = (w: number) => C_PAD.top + (1 - (w - yMin) / (yMax - yMin)) * C_CH

  const pts = sorted.map((c, i) => ({ x: xAt(i), y: yAt(c.weight) }))
  const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const bottomY = (C_PAD.top + C_CH).toFixed(1)
  const areaD = [
    `M ${pts[0].x.toFixed(1)} ${bottomY}`,
    ...pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pts[n - 1].x.toFixed(1)} ${bottomY}`,
    'Z',
  ].join(' ')

  const yTicks = [maxW, (minW + maxW) / 2, minW].map((w) => ({
    w,
    y: yAt(w),
    label: w.toFixed(1),
  }))

  const xLabels: Array<{ i: number; anchor: 'start' | 'middle' | 'end' }> = [
    { i: 0, anchor: 'start' },
    { i: n - 1, anchor: 'end' },
  ]
  if (n >= 5) xLabels.splice(1, 0, { i: Math.floor(n / 2), anchor: 'middle' })

  return (
    <section
      className="rounded-2xl border border-border-strong bg-surface-2 p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Weight Trend
        <span className="ml-2 font-normal normal-case opacity-60">
          {n} check-in{n !== 1 ? 's' : ''}
        </span>
      </p>
      <svg
        viewBox={`0 0 ${C_W} ${C_H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Your weight over time"
      >
        <title>Your weight over time</title>

        {yTicks.map(({ w, y }) => (
          <line
            key={w}
            x1={C_PAD.left}
            y1={y.toFixed(1)}
            x2={C_W - C_PAD.right}
            y2={y.toFixed(1)}
            style={{ stroke: 'var(--border)' }}
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}

        {yTicks.map(({ w, y, label }) => (
          <text
            key={`yl-${w}`}
            x={C_PAD.left - 6}
            y={y.toFixed(1)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="10"
            style={{ fill: 'var(--muted-foreground)' }}
          >
            {label}
          </text>
        ))}

        <path d={areaD} fill="rgba(77,124,254,0.10)" />

        <polyline
          points={linePoints}
          fill="none"
          stroke="#4D7CFE"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="3"
            fill="#4D7CFE"
            style={{ stroke: 'var(--surface-2)' }}
            strokeWidth="2"
          />
        ))}

        {xLabels.map(({ i, anchor }) => (
          <text
            key={`xl-${i}`}
            x={xAt(i).toFixed(1)}
            y={C_H - 4}
            textAnchor={anchor}
            fontSize="10"
            style={{ fill: 'var(--muted-foreground)' }}
          >
            {formatChartDate(sorted[i].date)}
          </text>
        ))}
      </svg>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PortalPage() {
  const client = await verifyClientSession()

  const [allCheckIns, latestMacros, latestApproved] = await Promise.all([
    prisma.checkIn.findMany({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        weight: true,
        sleepScore: true,
        fatigueScore: true,
        status: true,
      },
    }),
    prisma.macroHistory.findFirst({
      where: { clientId: client.id },
      orderBy: { changedAt: 'desc' },
      select: { changedAt: true },
    }),
    prisma.checkIn.findFirst({
      where: {
        clientId: client.id,
        status: CHECK_IN_STATUS.Approved,
        aiSynthesis: { not: null },
      },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, aiSynthesis: true },
    }),
  ])

  const latestCheckIn   = allCheckIns[0] ?? null
  const previousCheckIn = allCheckIns[1] ?? null
  const startingCheckIn = allCheckIns[allCheckIns.length - 1] ?? null
  const chartCheckIns   = [...allCheckIns].reverse()
  const recentCheckIns  = allCheckIns.slice(0, 5)

  // Goal-aware delta colouring: last check-in vs previous
  let deltaArrow = ''
  let deltaAbs   = ''
  let deltaClass = 'text-muted-foreground'
  if (latestCheckIn && previousCheckIn) {
    const delta = latestCheckIn.weight - previousCheckIn.weight
    const g = client.goal.toLowerCase()
    const isLoss = /loss|cut|lean|shred|deficit/.test(g)
    const isGain = /gain|bulk|build|mass|surplus/.test(g)
    const progress = (isLoss && delta < 0) || (isGain && delta > 0)
    const setback  = (isLoss && delta > 0) || (isGain && delta < 0)
    deltaArrow = delta < 0 ? '↓' : delta > 0 ? '↑' : '→'
    deltaAbs   = `${Math.abs(delta).toFixed(1)} kg since last check-in`
    deltaClass = progress ? 'text-status-green' : setback ? 'text-warning' : 'text-muted-foreground'
  }

  // Goal-aware total change: starting → current
  let totalChangeDir   = ''
  let totalChangeVal   = ''
  let totalChangeClass = 'text-muted-foreground'
  if (latestCheckIn && startingCheckIn && latestCheckIn.id !== startingCheckIn.id) {
    const totalDelta = latestCheckIn.weight - startingCheckIn.weight
    const g = client.goal.toLowerCase()
    const isLoss = /loss|cut|lean|shred|deficit/.test(g)
    const isGain = /gain|bulk|build|mass|surplus/.test(g)
    const progress = (isLoss && totalDelta < 0) || (isGain && totalDelta > 0)
    const setback  = (isLoss && totalDelta > 0) || (isGain && totalDelta < 0)
    totalChangeDir   = totalDelta < 0 ? '↓' : totalDelta > 0 ? '↑' : '→'
    totalChangeVal   = Math.abs(totalDelta).toFixed(1)
    totalChangeClass = progress ? 'text-status-green' : setback ? 'text-warning' : 'text-muted-foreground'
  }

  const totalCalories =
    client.targetProtein * 4 + client.targetCarbs * 4 + client.targetFats * 9

  const firstName = client.name.split(' ')[0]

  let coachMessage: string | null = null
  let coachMessageDate: Date | null = null
  if (latestApproved?.aiSynthesis) {
    try {
      const parsed = JSON.parse(latestApproved.aiSynthesis)
      const msg = parsed?.clientMessage?.trim()
      if (msg) {
        coachMessage = msg
        coachMessageDate = latestApproved.date
      }
    } catch { /* ignore malformed JSON */ }
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="pb-1 pt-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{client.currentPhase}</span>
          {' · '}
          {client.goal}
        </p>
      </div>

      {/* ── Coach message ──────────────────────────────────────────────────── */}
      {coachMessage && (
        <section
          className="rounded-2xl border border-border-strong bg-surface-2 p-5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <MessageSquare className="h-3.5 w-3.5" />
              Message from your coach
            </div>
            {coachMessageDate && (
              <span className="text-xs text-muted-foreground">
                {coachMessageDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{coachMessage}</p>
        </section>
      )}

      {/* ── Progress ───────────────────────────────────────────────────────── */}
      {latestCheckIn && (
        <section
          className="rounded-2xl border border-border-strong bg-surface-2 p-5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {startingCheckIn!.weight}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">kg</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Starting</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {latestCheckIn.weight}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">kg</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Current</p>
            </div>
            <div>
              {totalChangeVal ? (
                <p className={`font-mono text-2xl font-bold tabular-nums ${totalChangeClass}`}>
                  {totalChangeDir} {totalChangeVal}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">kg</span>
                </p>
              ) : (
                <p className="font-mono text-2xl font-bold tabular-nums text-muted-foreground">—</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Total Change</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Latest weigh-in ────────────────────────────────────────────────── */}
      <section
        className="rounded-2xl border border-border-strong bg-surface-2 p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Latest Weigh-in
        </p>
        {latestCheckIn ? (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-5xl font-bold tabular-nums leading-none text-foreground">
                {latestCheckIn.weight}
                <span className="ml-1.5 text-xl font-medium text-muted-foreground">kg</span>
              </p>
              {deltaAbs ? (
                <p className={`mt-2 text-sm font-medium ${deltaClass}`}>
                  {deltaArrow} {deltaAbs}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  First check-in — keep it up!
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">
              {latestCheckIn.date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        ) : (
          <div className="flex h-16 items-center">
            <p className="text-sm text-muted-foreground">
              No check-ins yet — your first one will appear here.
            </p>
          </div>
        )}
      </section>

      {/* ── Weight trend chart ─────────────────────────────────────────────── */}
      <WeightChart checkIns={chartCheckIns} />

      {/* ── Daily targets ──────────────────────────────────────────────────── */}
      <section
        className="rounded-2xl border border-border-strong bg-surface-2 p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Targets
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-3 px-3 py-3.5 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums text-macro-protein">
              {client.targetProtein}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">g</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="rounded-xl bg-surface-3 px-3 py-3.5 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums text-macro-carbs">
              {client.targetCarbs}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">g</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="rounded-xl bg-surface-3 px-3 py-3.5 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums text-macro-fats">
              {client.targetFats}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">g</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Fats</p>
          </div>
        </div>

        {client.targetFiber != null && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-3 px-4 py-3">
            <p className="text-sm text-muted-foreground">Fiber</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {client.targetFiber}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">g</span>
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {totalCalories}
            <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
          </p>
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

      {/* ── Check-in history ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Check-ins
          </p>
          <Link
            href="/portal/check-in"
            className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
          >
            Submit check-in →
          </Link>
        </div>
        {recentCheckIns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Start tracking your progress</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your first check-in to see your stats here.
            </p>
            <Link
              href="/portal/check-in"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/20 transition-colors hover:bg-accent/90"
            >
              Submit your first check-in
            </Link>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border border-border-strong bg-surface-2"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            {recentCheckIns.map((ci, index) => (
              <div
                key={ci.id}
                className={`flex items-center justify-between px-5 py-4${
                  index < recentCheckIns.length - 1 ? ' border-b border-border' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {ci.date.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Sleep {ci.sleepScore}/10
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Fatigue {ci.fatigueScore}/10
                    </span>
                    {ci.status !== CHECK_IN_STATUS.Approved && (
                      <Link
                        href={`/portal/check-in/${ci.id}/edit`}
                        className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
                <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {ci.weight}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
