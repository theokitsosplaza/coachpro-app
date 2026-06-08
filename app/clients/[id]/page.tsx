import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { analyzeClient } from '@/lib/coach-engine'
import type { Triage, Severity } from '@/lib/coach-engine'
import { cn } from '@/lib/utils'
import { InviteButton } from './InviteButton'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Design-system maps (mirror TriageBoardClient) ─────────────────────────────

const TRIAGE_LABEL: Record<Triage, string> = {
  red: 'Act Now',
  yellow: 'Review',
  green: 'On Track',
  grey: 'No Data',
}

const BADGE_STYLE: Record<Triage, string> = {
  red:    'border-anomaly/30 bg-anomaly-muted text-anomaly',
  yellow: 'border-warning/30 bg-warning-muted text-warning',
  green:  'border-success/25 bg-success-muted text-success',
  grey:   'border-border bg-muted text-muted-foreground',
}

const DOT: Record<Triage, string> = {
  red:    'bg-anomaly',
  yellow: 'bg-warning',
  green:  'bg-success',
  grey:   'bg-muted-foreground/40',
}

const AVATAR_BG: Record<Triage, string> = {
  red:    'bg-anomaly/10 text-anomaly',
  yellow: 'bg-warning/10 text-warning',
  green:  'bg-success/10 text-success',
  grey:   'bg-muted text-muted-foreground',
}

const SEVERITY_STYLE: Record<Severity, string> = {
  safety:  'border-anomaly/30 bg-anomaly-muted text-anomaly',
  warning: 'border-warning/30 bg-warning-muted text-warning',
  info:    'border-accent/30 bg-accent-soft text-accent',
}

const ADHERENCE_STYLE: Record<string, string> = {
  on_plan: 'border-success/25 bg-success-muted text-success',
  over:    'border-warning/30 bg-warning-muted text-warning',
  under:   'border-warning/30 bg-warning-muted text-warning',
  unknown: 'border-border bg-muted text-muted-foreground',
}

const ADHERENCE_LABEL: Record<string, string> = {
  on_plan: 'On Plan',
  over:    'Over Target',
  under:   'Under Target',
  unknown: 'No Data',
}

// ── Weight Trend Chart (server-rendered SVG) ──────────────────────────────────

function formatChartDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const C_W = 600
const C_H = 160
const C_PAD = { top: 16, right: 16, bottom: 32, left: 52 }
const C_CW = C_W - C_PAD.left - C_PAD.right  // 532
const C_CH = C_H - C_PAD.top - C_PAD.bottom  // 112

function WeightChart({ checkIns }: { checkIns: Array<{ date: Date; weight: number }> }) {
  if (checkIns.length === 0) return null

  const sorted = [...checkIns].sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sorted.length === 1) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Weight Trend
        </h2>
        <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
          Need at least 2 check-ins to show a trend.
        </div>
      </div>
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
  const yAt = (w: number) =>
    C_PAD.top + (1 - (w - yMin) / (yMax - yMin)) * C_CH

  const pts = sorted.map((c, i) => ({ x: xAt(i), y: yAt(c.weight), date: c.date }))
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
    <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Weight Trend
        <span className="ml-2 font-normal normal-case">
          {n} check-in{n !== 1 ? 's' : ''}
        </span>
      </h2>
      <svg
        viewBox={`0 0 ${C_W} ${C_H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Client weight over time"
      >
        <title>Client weight over time</title>

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
            style={{ stroke: 'var(--card)' }}
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
    </div>
  )
}

// ── Status badge for check-in rows ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center rounded-full border border-success/25 bg-success-muted px-2 py-0.5 text-[10px] font-semibold text-success">
        Approved
      </span>
    )
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning-muted px-2 py-0.5 text-[10px] font-semibold text-warning">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {status}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await verifyCoachSession();

  const { id: clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      checkIns: { orderBy: { date: 'desc' } },
    },
  })

  if (!client) notFound()

  const synthesis = analyzeClient(client, client.checkIns)
  const totalCalories =
    client.targetProtein * 4 + client.targetCarbs * 4 + client.targetFats * 9

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">

      {/* Back */}
      <Link
        href="/clients"
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to Master Roster
      </Link>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold',
              AVATAR_BG[synthesis.triage],
            )}
          >
            {initials(client.name)}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {client.name}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                  BADGE_STYLE[synthesis.triage],
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', DOT[synthesis.triage])} />
                {TRIAGE_LABEL[synthesis.triage]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {client.goal}
              {client.currentPhase && (
                <>
                  {' · '}
                  <span className="text-foreground">{client.currentPhase}</span>
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/clients/${client.id}/check-in/new`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
            >
              + New Check-in
            </Link>
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN: TARGETS + ANALYSIS ─────────────────────────────────── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* Current Targets */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Current Targets
          </h2>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="mb-1 text-[10px] font-semibold text-macro-protein">Protein</div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {client.targetProtein}
              </div>
              <div className="text-[10px] text-muted-foreground">g</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="mb-1 text-[10px] font-semibold text-macro-carbs">Carbs</div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {client.targetCarbs}
              </div>
              <div className="text-[10px] text-muted-foreground">g</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="mb-1 text-[10px] font-semibold text-macro-fats">Fats</div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {client.targetFats}
              </div>
              <div className="text-[10px] text-muted-foreground">g</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total calories</span>
            <span className="font-mono font-semibold text-foreground">{totalCalories} kcal</span>
          </div>

          {client.targetFiber != null && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">Fiber target</span>
              <span className="font-mono font-semibold text-foreground">
                {client.targetFiber}g
              </span>
            </div>
          )}

          {(client.email || client.phone) && (
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-muted-foreground">Email</span>
                  <span className="truncate text-foreground">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-muted-foreground">Phone</span>
                  <span className="text-foreground">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center justify-between border-t border-border/50 pt-2">
                  <span className="text-sm text-muted-foreground">Portal</span>
                  <InviteButton clientId={client.id} isInvited={!!client.authUserId} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Latest Analysis */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Latest Analysis
          </h2>

          <p className="mb-2 text-sm font-semibold leading-snug text-foreground">
            {synthesis.recommendation.headline}
          </p>

          {synthesis.weight.vsGoal && (
            <p className="mb-3 text-sm text-muted-foreground">{synthesis.weight.vsGoal}</p>
          )}

          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Adherence</span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                ADHERENCE_STYLE[synthesis.adherence.status],
              )}
            >
              {ADHERENCE_LABEL[synthesis.adherence.status]}
              {synthesis.adherence.status !== 'unknown' && (
                <> · {Math.round(synthesis.adherence.calorieRatio * 100)}%</>
              )}
            </span>
          </div>

          {synthesis.flags.length > 0 && (
            <div className="space-y-2">
              {synthesis.flags.slice(0, 3).map((flag) => (
                <div
                  key={flag.code}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-semibold',
                    SEVERITY_STYLE[flag.severity],
                  )}
                >
                  {flag.title}
                </div>
              ))}
            </div>
          )}

          {synthesis.flags.length === 0 && synthesis.dataQuality.sufficient && (
            <p className="text-xs text-success">No flags — client is on track.</p>
          )}

          {synthesis.dataQuality.warnings.length > 0 &&
            synthesis.dataQuality.warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {w}
              </p>
            ))}
        </div>
      </div>

      {/* ── WEIGHT TREND CHART ─────────────────────────────────────────────── */}
      <WeightChart checkIns={client.checkIns} />

      {/* ── CHECK-IN HISTORY ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Check-in History
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {client.checkIns.length}
            </span>
          </h2>
        </div>

        {client.checkIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            <Link
              href={`/clients/${client.id}/check-in/new`}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Log the first check-in →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Weight
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-macro-protein">
                    Protein
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-macro-carbs">
                    Carbs
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-macro-fats">
                    Fats
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Sleep
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Fatigue
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Cycle
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.checkIns.map((ci) => (
                  <tr
                    key={ci.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-foreground">
                      {ci.date.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-foreground">
                      {ci.weight} kg
                    </td>
                    <td className="px-5 py-3.5 font-mono text-macro-protein">
                      {ci.loggedProtein}g
                    </td>
                    <td className="px-5 py-3.5 font-mono text-macro-carbs">
                      {ci.loggedCarbs}g
                    </td>
                    <td className="px-5 py-3.5 font-mono text-macro-fats">
                      {ci.loggedFats}g
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-foreground">
                      {ci.sleepScore}/10
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-foreground">
                      {ci.fatigueScore}/10
                    </td>
                    <td className="px-5 py-3.5">
                      {ci.cycleAffected ? (
                        <span className="text-xs font-semibold text-accent">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={ci.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
