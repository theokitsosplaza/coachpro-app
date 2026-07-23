import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { analyzeClient } from '@/lib/coach-engine'
import type { Triage, Severity } from '@/lib/coach-engine'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'
import { parseCoachQuestions, parseAnswerSet, visibleAnswers } from '@/lib/questionnaire'
import { cn } from '@/lib/utils'
import { InviteButton } from './InviteButton'
import { Archive, ClipboardList, ChevronLeft, Plus, Pencil, AlertTriangle } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Design-system maps (Vimafy page-one tints) ────────────────────────────────

const TRIAGE_LABEL: Record<Triage, string> = {
  red: 'Act Now',
  yellow: 'Review',
  green: 'On Track',
  grey: 'No Data',
}

const BADGE_STYLE: Record<Triage, string> = {
  red:    'border-[color-mix(in_oklab,var(--red)_28%,transparent)] bg-[color-mix(in_oklab,var(--red)_12%,transparent)] text-red',
  yellow: 'border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] text-amber',
  green:  'border-[color-mix(in_oklab,var(--green)_26%,transparent)] bg-[color-mix(in_oklab,var(--green)_12%,transparent)] text-green',
  grey:   'border-hair-2 bg-white/[0.04] text-muted-1',
}

const DOT: Record<Triage, string> = {
  red:    'bg-red',
  yellow: 'bg-amber',
  green:  'bg-green',
  grey:   'bg-muted-2',
}

const SEVERITY_STYLE: Record<Severity, string> = {
  safety:  'border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] text-red',
  warning: 'border-[color-mix(in_oklab,var(--amber)_26%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] text-amber',
  info:    'border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent-lite',
}

const ADHERENCE_STYLE: Record<string, string> = {
  on_plan: 'border-[color-mix(in_oklab,var(--green)_26%,transparent)] bg-[color-mix(in_oklab,var(--green)_12%,transparent)] text-green',
  over:    'border-[color-mix(in_oklab,var(--amber)_26%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] text-amber',
  under:   'border-[color-mix(in_oklab,var(--amber)_26%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] text-amber',
  unknown: 'border-hair-2 bg-white/[0.04] text-muted-1',
}

const ADHERENCE_LABEL: Record<string, string> = {
  on_plan: 'On Plan',
  over:    'Over Target',
  under:   'Under Target',
  unknown: 'No Data',
}

// Shared card shell (matches page-one DashboardClient panels).
const CARD =
  'rounded-2xl border border-hair bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
const EYEBROW =
  'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1'

// ── Weight Trend Chart (server-rendered SVG) ──────────────────────────────────
// NOTE: all coordinate/area/line/dot math below is unchanged — only the SVG
// presentation (gradient fill, accent line, end dot, min/max labels) was reskinned.

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
      <div className={cn(CARD, 'mb-4 p-[22px]')}>
        <div className="mb-4 flex items-center gap-2.5">
          <span className={EYEBROW}>Weight trend</span>
        </div>
        <div className="flex h-28 items-center justify-center text-[13px] text-muted-2">
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

  // A flat series (every check-in the same weight) collapses max / mid / min
  // into one value — which used to render three gridlines stacked on the same
  // y with duplicate React keys. Dedupe to the distinct weights only; the
  // render below keys by index since these are static gridlines.
  const yTicks = [...new Set([maxW, (minW + maxW) / 2, minW])].map((w) => ({
    w,
    y: yAt(w),
  }))

  const endDot = pts[n - 1]

  // Total change since the FIRST check-in on file — a context figure only.
  // Every verdict still comes from the engine's 28-day least-squares trend;
  // the caveat line under the figure says so explicitly. Rounded before the
  // sign is read so a -0.04 kg drift renders as "No change", not "-0.0".
  // Only reached when n >= 2 (the single-check-in early return above), so a
  // meaningless "0.0 kg since <today>" can never render for a new client.
  const totalDeltaKg = Number((sorted[n - 1].weight - sorted[0].weight).toFixed(1))
  const firstDateLabel = sorted[0].date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const totalChangeLabel =
    totalDeltaKg === 0
      ? `No change since the first check-in on ${firstDateLabel}`
      : `${totalDeltaKg < 0 ? 'Down' : 'Up'} ${Math.abs(totalDeltaKg).toFixed(1)} kg since the first check-in on ${firstDateLabel}`

  return (
    <div className={cn(CARD, 'mb-4 p-[22px]')}>
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className={EYEBROW}>Weight trend</span>
        <span className="text-[11.5px] text-muted-2">
          {n} check-in{n !== 1 ? 's' : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${C_W} ${C_H}`}
        className="block w-full overflow-visible"
        role="img"
        aria-label="Client weight over time"
      >
        <title>Client weight over time</title>

        <defs>
          <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map(({ y }, i) => (
          <line
            key={i}
            x1={C_PAD.left}
            y1={y.toFixed(1)}
            x2={C_W - C_PAD.right}
            y2={y.toFixed(1)}
            style={{ stroke: 'var(--hair)' }}
            strokeWidth="1"
          />
        ))}

        <path d={areaD} fill="url(#weightArea)" />

        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle
          cx={endDot.x.toFixed(1)}
          cy={endDot.y.toFixed(1)}
          r="4.5"
          fill="var(--accent)"
          style={{ stroke: 'var(--surface)' }}
          strokeWidth="2.5"
        />
      </svg>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] font-semibold text-muted-2">
        <span>{minW.toFixed(1)} kg</span>
        <span>{maxW.toFixed(1)} kg</span>
      </div>

      {/* All-time weight context — display only, never a verdict input */}
      <div className="mt-3 border-t border-hair pt-3">
        <p className="text-sm font-medium text-text">{totalChangeLabel}</p>
        <p className="mt-0.5 text-xs text-muted-2">
          Context only — the weekly recommendation is based on the 28-day trend, not this figure.
        </p>
      </div>
    </div>
  )
}

// ── Status badge for check-in rows (dot + label) ─────────────────────────────

function StatusBadge({ status }: { status: string }) {
  let color = 'var(--muted-2)'
  let label = status
  if (status === CHECK_IN_STATUS.Approved) {
    color = 'var(--green)'
    label = 'Approved'
  } else if (status === CHECK_IN_STATUS.Pending) {
    color = 'var(--amber)'
    label = 'Pending'
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold"
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

// ── Check-in history grid template (Date · Weight · P · C · F · Sleep · Fatigue · Cycle · Status · Edit) ──
const HISTORY_COLS =
  'grid grid-cols-[minmax(110px,1.4fr)_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.6fr_0.9fr_0.5fr] gap-2'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const coach = await verifyCoachSession();

  const { id: clientId } = await params

  const client = await prisma.client.findFirst({
    where: { id: clientId, coachId: coach.id },
    include: {
      checkIns: { orderBy: [{ date: 'desc' }, { id: 'desc' }] },
    },
  })

  if (!client) notFound()

  const synthesis = analyzeClient(client, client.checkIns)

  // Background card data — the SAME purge-on-delete filter the AI context
  // uses (lib/questionnaire.ts), so what the coach sees here is exactly what
  // the AI reads: answers to the coach's CURRENT questions only, snapshot
  // labels, current order.
  const backgroundPairs = visibleAnswers(
    parseCoachQuestions(coach.questionnaire),
    parseAnswerSet(client.questionnaireAnswers),
  )
  const totalCalories =
    client.targetProtein * 4 + client.targetCarbs * 4 + client.targetFats * 9

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">

      {/* Back */}
      <Link
        href="/clients"
        className="mb-5 inline-flex items-center gap-2 rounded text-[13px] font-semibold text-muted-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.1} />
        Back to Clients
      </Link>

      {/* Archived banner */}
      {client.archivedAt && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_9%,transparent)] px-4 py-3">
          <Archive className="h-4 w-4 shrink-0 text-amber" strokeWidth={2} />
          <p className="text-[13px] font-semibold text-amber">
            This client is archived.{' '}
            <Link
              href="/clients?view=archived"
              className="underline underline-offset-2 transition-colors hover:text-amber/80"
            >
              Restore or delete from the Clients page
            </Link>.
          </p>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className={cn(CARD, 'mb-4 p-[22px]')}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">

            {/* Avatar */}
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[14px] bg-[color-mix(in_oklab,var(--accent)_20%,var(--surface))] font-display text-[18px] font-bold text-accent-lite">
              {initials(client.name)}
            </div>

            {/* Name + meta */}
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-[22px] font-extrabold tracking-[-0.01em] text-text">
                  {client.name}
                </h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                    BADGE_STYLE[synthesis.triage],
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', DOT[synthesis.triage])} />
                  {TRIAGE_LABEL[synthesis.triage]}
                </span>
              </div>
              <p className="text-[13.5px] text-muted-1">
                {client.goal}
                {client.currentPhase && (
                  <>
                    {' · '}
                    <span className="text-text">{client.currentPhase}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2.5">
            <Link
              href={`/clients/${client.id}/check-in/new`}
              className="inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-accent px-4 text-[13px] font-bold text-white shadow-[0_10px_26px_-14px_color-mix(in_oklab,var(--accent)_90%,transparent)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.1} />
              New check-in
            </Link>
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex h-[42px] items-center gap-2 rounded-[11px] border border-hair-2 bg-surface-2 px-4 text-[13px] font-bold text-nav transition hover:bg-surface-3 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <Pencil className="h-[15px] w-[15px]" strokeWidth={2} />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN: TARGETS + ANALYSIS ─────────────────────────────────── */}
      <div className="mb-4 grid gap-4 md:grid-cols-[1.15fr_1fr]">

        {/* Current Targets */}
        <div className={cn(CARD, 'p-[22px]')}>
          <div className={cn(EYEBROW, 'mb-[18px]')}>Current targets</div>

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-hair bg-surface-deep p-4 text-center">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-lite">Protein</div>
              <div className="font-mono text-[30px] font-semibold tracking-[-0.02em] text-text">
                {client.targetProtein}
                <span className="text-[13px] text-muted-2">g</span>
              </div>
            </div>
            <div className="rounded-xl border border-hair bg-surface-deep p-4 text-center">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-green">Carbs</div>
              <div className="font-mono text-[30px] font-semibold tracking-[-0.02em] text-text">
                {client.targetCarbs}
                <span className="text-[13px] text-muted-2">g</span>
              </div>
            </div>
            <div className="rounded-xl border border-hair bg-surface-deep p-4 text-center">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber">Fats</div>
              <div className="font-mono text-[30px] font-semibold tracking-[-0.02em] text-text">
                {client.targetFats}
                <span className="text-[13px] text-muted-2">g</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-hair py-3">
            <span className="text-[13px] text-muted-1">Total calories</span>
            <span className="font-mono text-[17px] font-semibold text-text">
              {totalCalories} <span className="text-[12px] text-muted-2">kcal</span>
            </span>
          </div>

          {(client.email || client.phone) && (
            <>
              {client.email && (
                <div className="flex items-center justify-between gap-3 border-t border-hair py-3">
                  <span className="shrink-0 text-[13px] text-muted-1">Email</span>
                  <span className="truncate text-[13px] text-nav">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center justify-between gap-3 border-t border-hair py-3">
                  <span className="shrink-0 text-[13px] text-muted-1">Phone</span>
                  <span className="text-[13px] text-nav">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center justify-between gap-3 border-t border-hair py-3">
                  <span className="text-[13px] text-muted-1">Client portal</span>
                  <InviteButton clientId={client.id} isInvited={!!client.authUserId} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Latest Analysis */}
        <div className={cn(CARD, 'p-[22px]')}>
          <div className={cn(EYEBROW, 'mb-4')}>Latest analysis</div>

          {!synthesis.dataQuality.sufficient ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <ClipboardList className="h-8 w-8 text-muted-3" strokeWidth={1.5} />
              <p className="text-[14px] font-bold text-muted-1">No analysis yet</p>
              <p className="max-w-[220px] text-[12.5px] leading-relaxed text-muted-2">
                Once {client.name} submits their first couple of check-ins, you&apos;ll see weight
                trends, adherence, and AI analysis here.
              </p>
              <Link
                href={`/clients/${client.id}/check-in/new`}
                className="rounded text-[12.5px] font-semibold text-accent-lite hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                Log the first check-in →
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 font-display text-[16px] font-bold leading-snug tracking-[-0.01em] text-text">
                {synthesis.recommendation.headline}
              </p>

              {synthesis.weight.vsGoal && (
                <p className="mb-[18px] text-[13.5px] leading-relaxed text-muted-1">
                  {synthesis.weight.vsGoal}
                </p>
              )}

              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-[12.5px] text-muted-1">Adherence</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold',
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
                <div className="flex flex-col items-start gap-2">
                  {synthesis.flags.slice(0, 3).map((flag) => (
                    <span
                      key={flag.code}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[12.5px] font-bold',
                        SEVERITY_STYLE[flag.severity],
                      )}
                    >
                      <AlertTriangle className="h-[14px] w-[14px] shrink-0" strokeWidth={2} />
                      {flag.title}
                    </span>
                  ))}
                </div>
              )}

              {synthesis.flags.length === 0 && synthesis.dataQuality.sufficient && (
                <p className="text-[12.5px] font-semibold text-green">No flags — client is on track.</p>
              )}

              {synthesis.dataQuality.warnings.length > 0 &&
                synthesis.dataQuality.warnings.map((w, i) => (
                  <p key={i} className="mt-2 text-[12.5px] text-muted-2">
                    {w}
                  </p>
                ))}
            </>
          )}
        </div>
      </div>

      {/* ── WEIGHT TREND CHART ─────────────────────────────────────────────── */}
      {/* ── Background (coach-recorded onboarding context) ────────────────── */}
      <div className={cn(CARD, 'mb-4 p-[22px]')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={EYEBROW}>Background</span>
          <Link
            href={`/clients/${client.id}/questionnaire`}
            className="rounded font-sans text-[12px] font-semibold text-accent-lite transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {backgroundPairs.length > 0 ? 'Edit' : 'Fill in questionnaire'}
          </Link>
        </div>
        {backgroundPairs.length > 0 ? (
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {backgroundPairs.map((p) => (
              <div key={p.questionId} className="flex items-baseline justify-between gap-4 border-b border-hair py-2">
                <dt className="text-[12.5px] text-muted-1">{p.label}</dt>
                <dd className="text-right text-[13px] font-medium text-text">{p.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-muted-2">
            No background recorded yet. These answers become stable context the AI reads on every check-in.
          </p>
        )}
      </div>

      <WeightChart checkIns={client.checkIns} />

      {/* ── CHECK-IN HISTORY ───────────────────────────────────────────────── */}
      <div className={cn(CARD, 'p-[22px]')}>
        <div className="mb-4 flex items-center gap-2.5">
          <span className={EYEBROW}>Check-in history</span>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-2">
            {client.checkIns.length}
          </span>
        </div>

        {client.checkIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <p className="text-[13.5px] text-muted-2">No check-ins yet.</p>
            <Link
              href={`/clients/${client.id}/check-in/new`}
              className="rounded text-[12.5px] font-semibold text-accent-lite hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              Log the first check-in →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Header */}
              <div className={cn(HISTORY_COLS, 'border-b border-hair px-1 pb-3 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-2')}>
                <span>Date</span>
                <span>Weight</span>
                <span>Protein</span>
                <span>Carbs</span>
                <span>Fats</span>
                <span>Sleep</span>
                <span>Fatigue</span>
                <span>Cycle</span>
                <span>Status</span>
                <span aria-hidden="true" />
              </div>

              {/* Rows */}
              {client.checkIns.map((ci: NonNullable<typeof client>['checkIns'][number]) => (
                <div
                  key={ci.id}
                  className={cn(HISTORY_COLS, 'items-center border-b border-hair px-1 py-3.5 font-mono text-[12.5px] text-nav transition-colors hover:bg-white/[0.02]')}
                >
                  <span className="font-sans font-semibold text-text">
                    {ci.date.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span>{ci.weight} kg</span>
                  <span>{ci.loggedProtein}g</span>
                  <span>{ci.loggedCarbs}g</span>
                  <span>{ci.loggedFats}g</span>
                  <span>{ci.sleepScore}/10</span>
                  <span>{ci.fatigueScore}/10</span>
                  <span>
                    {ci.cycleAffected ? (
                      <span className="font-sans text-[11px] font-bold text-accent-lite">Yes</span>
                    ) : (
                      <span className="text-muted-3">—</span>
                    )}
                  </span>
                  <span>
                    <StatusBadge status={ci.status} />
                  </span>
                  <span>
                    <Link
                      href={`/clients/${client.id}/check-in/${ci.id}/edit`}
                      className="rounded font-sans text-[12px] font-semibold text-accent-lite transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      Edit
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
