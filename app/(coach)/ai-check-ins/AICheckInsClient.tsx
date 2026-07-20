"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Moon,
  Activity,
  Scale,
  Target,
  Pencil,
  Send,
  Clock,
  Zap,
  ShieldCheck,
  Minus,
  Loader2,
  XCircle,
  BarChart3,
  MessageSquare,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECK_IN_STATUS, type CheckInStatus } from "@/lib/check-in-status";
import { attentionFlag, type AttentionSignal } from "@/lib/attention-flag";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlagColor = "danger" | "warning" | "success" | "neutral";

// Passed in from the server component (page.tsx)
export type QueueClientData = {
  id: string;
  name: string;
  initials: string;
  submittedAt: string | null; // null when the client has no check-ins
  status: CheckInStatus | 'none';
  savedAnalysis: {
    checkInId:        string;
    coachSummary:     string;
    clientMessage:    string;
    clientReflection: string;
    macros: { protein: number; carbs: number; fats: number };
    approvedAt:       string;
    attention:        AttentionSignal | null;
  } | null;
};

// Shape of the JSON returned by GET /api/checkin-analysis
type AnalysisResult = {
  clientInput: {
    id: string;
    name: string;
    goal: string;
    currentPhase?: string | null;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  };
  latestCheckInId: string;
  latestCheckIn: {
    date: string;
    weight: number;
    sleepScore: number;
    fatigueScore: number;
    status: string;
    clientReflection: string;
  };
  // Weight from the immediately-preceding check-in. Always sent by the route
  // (it requires >= 2 check-ins before analysing), and used only for the
  // one-period kg delta on the weight tile.
  previousWeight: number;
  synthesis: {
    triage: "red" | "yellow" | "green" | "grey";
    weight: {
      latest: number | null;
      ratePerWeekPct: number | null;
      direction: "losing" | "gaining" | "flat" | null;
      vsGoal: string;
    };
    adherence: {
      calorieRatio: number;
      proteinRatio: number;
      carbRatio: number;
      fatRatio: number;
      status: "on_plan" | "under" | "over" | "unknown";
    };
    flags: Array<{
      code: string;
      severity: "safety" | "warning" | "info";
      title: string;
      detail: string;
    }>;
    recommendation: {
      action: string;
      headline: string;
      rationale: string;
      proposedMacros: { protein: number; carbs: number; fats: number } | null;
    };
    dataQuality: { sufficient: boolean; warnings: string[] };
  };
  aiOutput: {
    coachSummary: string;
    clientMessage: string;
    attention: AttentionSignal | null;
  };
};

// ── Colour helpers ────────────────────────────────────────────────────────────

// Status → text colour (design system v2 tokens). The queue dot, the metric
// value, and the badges all resolve their colour through this map.
const STATUS_TEXT: Record<FlagColor, string> = {
  danger:  "text-red",
  warning: "text-amber",
  success: "text-green",
  neutral: "text-muted-2",
};

function sleepColor(score: number): FlagColor {
  if (score >= 7) return "success";
  if (score >= 5) return "warning";
  return "danger";
}

function fatigueColor(score: number): FlagColor {
  if (score <= 3) return "success";
  if (score <= 6) return "warning";
  return "danger";
}

// Flag codes the engine mints from the WEIGHT trend specifically. Keep in sync
// with lib/coach-engine.ts. CYCLE_AFFECTED is deliberately excluded: it is
// severity 'info' and means "the scale is unreadable this week, hold" — not a
// weight problem to colour for.
const WEIGHT_FLAG_CODES = new Set([
  "SAFETY_RAPID_LOSS",
  "PLATEAU_GOOD_ADHERENCE",
  "STALL_OVEREATING",
  "STALL_UNDEREATING",
  "GAIN_TOO_FAST",
  "GAIN_STALLED",
  "NOGAIN_UNDEREATING",
  "NOGAIN_OVEREATING",
  "MAINTENANCE_DRIFT",
]);

// Severity colour for the weight tile, derived ONLY from weight-related flags.
//
// This previously took the whole-client triage, which misattributed in both
// directions: a client flagged red for SLEEP rendered a red WEIGHT tile (the
// coach's eye lands on the wrong metric), and a green client rendered a green
// weight tile even though nothing had actually verified the trend.
//
// Absence of a flag is not evidence of a good trend, so neutral is the FLOOR:
// this never returns "success". The tile stays neutral and only escalates when
// a weight flag genuinely fires.
function weightColorFromFlags(flags: Array<{ code: string; severity: string }>): FlagColor {
  const weightFlags = flags.filter((f) => WEIGHT_FLAG_CODES.has(f.code));
  if (weightFlags.some((f) => f.severity === "safety")) return "danger";
  if (weightFlags.some((f) => f.severity === "warning")) return "warning";
  return "neutral";
}

function adherenceColor(status: string): FlagColor {
  if (status === "on_plan") return "success";
  if (status === "unknown") return "neutral";
  return "warning";
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "N/A";
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${Number(rate.toFixed(2))}%/wk`;
}

// Compact queue timestamp. The list is sorted oldest-first by FULL timestamp,
// but showing only the clock time makes multi-day check-ins look out of order
// (an 18:06 from two days ago sits above a 14:42 from today). So every row gets
// an explicit day label: "Today 14:42", "Yesterday 18:06", "17 Jul 18:06".
// `mounted` gates the relative-day math to the client, so the server render and
// first paint stay time-only and there is no hydration mismatch on the labels.
function formatCheckinTime(iso: string, mounted: boolean): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!mounted) return time;
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff <= 0) return `Today ${time}`;      // today (or clock skew)
  if (dayDiff === 1) return `Yesterday ${time}`;
  const datePart = d.toLocaleDateString(
    "en-GB",
    d.getFullYear() === now.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
  return `${datePart} ${time}`;                  // e.g. "17 Jul 18:06"
}

// Contextual do/don't guidance for each engine action
const ACTION_GUIDANCE: Record<string, { dont: string[]; do: string[] }> = {
  adjust_macros:     { dont: ["Ignore this trend — the engine has detected a genuine plateau"], do: ["Review and approve the proposed macro adjustment", "Monitor trend for 2 weeks before adjusting again"] },
  address_adherence: { dont: ["Change macro targets while adherence is poor"], do: ["Coach the client on food tracking accuracy", "Reinforce the existing plan before making changes"] },
  deload:            { dont: ["Add more training volume this week"], do: ["Swap one session for active recovery or mobility", "Flag sleep and stress for follow-up next check-in"] },
  diet_break:        { dont: ["Continue the deficit without a break"], do: ["Raise calories to maintenance temporarily", "Re-assess at check-in after the break period"] },
  hold:              { dont: ["Make any changes — progress is on track"], do: ["Hold current macros and training plan", "Re-assess trend at the next check-in"] },
  review:            { dont: ["Make any macro or plan changes without a human decision"], do: ["Review the safety flag personally before acting", "Contact the client directly if urgent"] },
  await_data:        { dont: ["Draw conclusions from insufficient data"], do: ["Encourage the client to submit check-ins weekly", "Revisit once at least 2 check-ins are on file"] },
};

// ── Small shared components ───────────────────────────────────────────────────

function FlagBadge({ label, color }: { label: string; color: FlagColor }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold", STATUS_TEXT[color])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function InsightStat({ label, value, delta, color, icon: Icon }: {
  label: string; value: string; delta?: string; color: FlagColor; icon: typeof Scale;
}) {
  const valueText: Record<FlagColor, string> = {
    danger: "text-red", warning: "text-amber", success: "text-green", neutral: "text-text",
  };
  return (
    <div className="rounded-[14px] border border-hair bg-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-1">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className={cn("mt-3.5 font-mono text-[26px] font-medium tabular-nums tracking-[-0.02em]", valueText[color])}>{value}</p>
      {delta && <p className="mt-1.5 text-[11.5px] text-muted-2">{delta}</p>}
    </div>
  );
}

// ── Client reflection (the client's raw words) ────────────────────────────────

// Shows the exact free-text the client submitted with this check-in, unedited.
// Rendered above the AI Synthesis so the coach reads the source before the
// machine's interpretation of it. Falls back to a muted note when the client
// (or a coach-entered check-in) left it blank.
function ReflectionCard({ name, reflection }: { name: string; reflection: string }) {
  const text = reflection?.trim();
  return (
    <section aria-label={`${name}'s check-in reflection`}>
      <div className="rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-3 text-muted-1">
            <Quote className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13.5px] font-bold text-text">In {name}&apos;s own words</h2>
            <p className="text-[11.5px] text-muted-2">The client&apos;s written reflection for this check-in</p>
          </div>
        </div>
        {text ? (
          <blockquote className="whitespace-pre-wrap border-l-2 border-[color-mix(in_oklab,var(--accent)_45%,transparent)] pl-4 text-[14.5px] italic leading-[1.65] text-text/85">
            {text}
          </blockquote>
        ) : (
          <p className="text-sm italic text-muted-2">
            No written reflection was included with this check-in.
          </p>
        )}
      </div>
    </section>
  );
}

// ── Left panel (queue) ────────────────────────────────────────────────────────

function LeftPanel({ clients, selectedId, onSelect }: {
  clients: QueueClientData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pending = clients.filter((c) => c.status === CHECK_IN_STATUS.Pending).length;

  // Relative-day labels ("Today"/"Yesterday") depend on the current time, so
  // enrich them only after mount — SSR and first paint stay time-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function queueFlag(status: CheckInStatus | 'none'): { label: string; color: FlagColor } {
    if (status === CHECK_IN_STATUS.Approved) return { label: "Approved",       color: "success" };
    if (status === CHECK_IN_STATUS.Pending)  return { label: "Pending Review", color: "warning" };
    return                                          { label: "No submission",  color: "neutral" };
  }

  return (
    <aside
      className={cn(
        "flex w-[334px] shrink-0 flex-col border-r border-hair bg-sidebar max-[860px]:w-full",
        // Mobile master-detail: hide the queue once a client's review is open.
        selectedId && "max-[860px]:hidden"
      )}
    >
      <div className="border-b border-hair px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C7CDD6]">Check-in Queue</h2>
          {pending > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-[7px] bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] px-1.5 font-mono text-[11px] font-semibold tabular-nums text-accent-lite">
              {pending}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] text-muted-2">
          <span className="font-mono tabular-nums text-muted-1">{clients.length}</span> clients ·{" "}
          <span className="font-mono tabular-nums text-muted-1">{pending}</span> pending review
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {clients.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-2">
            No check-ins in the queue yet.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {clients.map((client) => {
            const isSelected = client.id === selectedId;
            const flag = queueFlag(client.status);
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelect(client.id)}
                className={cn(
                  "group relative w-full rounded-[13px] px-3.5 py-3.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                  isSelected
                    ? "bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
                    : "hover:bg-white/[0.03]"
                )}
              >
                {isSelected && (
                  <span className="pointer-events-none absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-r-[3px] bg-accent" aria-hidden />
                )}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-[13px] font-bold",
                    isSelected ? "bg-accent text-white" : "bg-surface-3 text-muted-1"
                  )}>
                    {client.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-[14px] font-bold", isSelected ? "text-text" : "text-text/85")}>
                        {client.name}
                      </span>
                      {client.submittedAt && (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-2">
                          <Clock className="h-2.5 w-2.5" />
                          {formatCheckinTime(client.submittedAt, mounted)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <FlagBadge label={flag.label} color={flag.color} />
                    </div>
                  </div>
                </div>
                {client.status === CHECK_IN_STATUS.Approved && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-3">
                    <CheckCircle2 className="h-3 w-3" />Reviewed
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ── Loading panel ─────────────────────────────────────────────────────────────

function LoadingPanel({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]">
        <Loader2 className="h-6 w-6 animate-spin text-accent-lite" />
      </div>
      <div>
        <p className="text-sm font-bold text-text">Analysing {name}</p>
        <p className="mt-1 text-xs text-muted-2">Running engine + Claude — this takes a few seconds</p>
      </div>
    </div>
  );
}

// ── Error panel ───────────────────────────────────────────────────────────────

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--red)_30%,transparent)] bg-[color-mix(in_oklab,var(--red)_12%,transparent)]">
        <XCircle className="h-6 w-6 text-red" />
      </div>
      <div>
        <p className="text-sm font-bold text-text">Could not generate analysis</p>
        <p className="mt-1 max-w-sm text-xs text-muted-2">{message}</p>
      </div>
    </div>
  );
}

// ── Empty / no client selected ────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-bg text-center max-[860px]:hidden">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-hair bg-surface">
        <Sparkles className="h-6 w-6 text-muted-2" />
      </div>
      <p className="text-sm text-muted-2">Select a client from the queue to run the AI analysis</p>
    </div>
  );
}

// ── Analysis panel ────────────────────────────────────────────────────────────

type ConfirmedMacros = { protein: number; carbs: number; fats: number };

function computeMacroWarnings(macros: ConfirmedMacros | null): string[] {
  if (!macros) return [];
  const { protein, carbs, fats } = macros;
  const ws: string[] = [];
  if (protein > 0 && protein < 40)
    ws.push(`Protein is ${protein}g — unusually low (typically ≥ 40g).`);
  if (protein > 600)
    ws.push(`Protein is ${protein}g — unusually high (typically ≤ 600g).`);
  if (carbs > 1000)
    ws.push(`Carbs is ${carbs}g — unusually high (typically ≤ 1000g).`);
  if (fats > 350)
    ws.push(`Fats is ${fats}g — unusually high (typically ≤ 350g).`);
  const kcal = protein * 4 + carbs * 4 + fats * 9;
  if (kcal < 1000)
    ws.push(`These macros total ${Math.round(kcal)} kcal/day — unusually low.`);
  else if (kcal > 6000)
    ws.push(`These macros total ${Math.round(kcal)} kcal/day — unusually high.`);
  return ws;
}

function AnalysisPanel({
  data,
  onApprove,
  approving,
  approved,
}: {
  data: AnalysisResult;
  onApprove: (macros: ConfirmedMacros | null, message: string) => void;
  approving: boolean;
  approved: boolean;
}) {
  const { clientInput, latestCheckIn, previousWeight, synthesis, aiOutput } = data;
  const { recommendation, flags, weight, adherence } = synthesis;

  // Editable macro state — pre-filled from AI proposal or current targets on manual open
  const [editedMacros, setEditedMacros] = useState<ConfirmedMacros | null>(
    recommendation.proposedMacros ?? null,
  );
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [macroWarningsAcknowledged, setMacroWarningsAcknowledged] = useState(false);

  // Editable client message — pre-filled with AI draft
  const [editedMessage, setEditedMessage] = useState<string>(
    aiOutput.clientMessage ?? '',
  );
  const messageValid = !aiOutput.clientMessage || editedMessage.trim().length > 0;

  // Validate before enabling Approve
  const macrosValid =
    editedMacros === null ||
    (Number.isFinite(editedMacros.protein) && editedMacros.protein >= 0 &&
     Number.isFinite(editedMacros.carbs)   && editedMacros.carbs   >= 0 &&
     Number.isFinite(editedMacros.fats)    && editedMacros.fats    >= 0);
  const macroWarnings = computeMacroWarnings(editedMacros);

  // Derive insight stat colours
  const weightColor = weightColorFromFlags(flags);
  const weightDirIcon = weight.direction === "losing" ? TrendingDown : weight.direction === "gaining" ? TrendingUp : Minus;

  // kg change across THIS ONE PERIOD (previous check-in -> latest), labelled
  // with its period so it can never read as an all-time figure. Deliberately
  // kg-only: the tile's value is already a percentage (the 28-day %/wk trend),
  // and a second, differently-derived percentage next to it would invite the
  // coach to reconcile two figures that answer different questions.
  // Rounded before the sign is read so a -0.04 kg drift renders "0.0", not "-0.0".
  const weightDeltaKg = Number((latestCheckIn.weight - previousWeight).toFixed(1));
  const weightDeltaLabel =
    `${weightDeltaKg > 0 ? "+" : weightDeltaKg < 0 ? "-" : ""}` +
    `${Math.abs(weightDeltaKg).toFixed(1)} kg since last check-in`;
  const guidance = ACTION_GUIDANCE[recommendation.action] ?? ACTION_GUIDANCE["hold"];
  const isReview = recommendation.action === "review";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Client context bar ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-hair bg-sidebar px-8 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_20%,#14161B)] text-[15px] font-bold text-accent-lite">
              {clientInput.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-[19px] font-extrabold tracking-[-0.01em] text-text">{clientInput.name}</h1>
                {isReview ? (
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[color-mix(in_oklab,var(--red)_28%,transparent)] bg-[color-mix(in_oklab,var(--red)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-red">
                    <span className="h-1.5 w-1.5 rounded-full bg-red" />Safety Review
                  </span>
                ) : latestCheckIn.status === CHECK_IN_STATUS.Approved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[color-mix(in_oklab,var(--green)_28%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-green" />Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-amber">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />Pending Review
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-muted-1">
                {clientInput.currentPhase ?? clientInput.goal}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 text-xs">
            {[
              { label: "Goal", value: clientInput.goal, icon: Target, mono: false },
              { label: "Protein target", value: `${clientInput.targetProtein} g/day`, icon: Activity, mono: true },
              { label: "Submitted", value: new Date(latestCheckIn.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), icon: Clock, mono: true },
            ].map(({ label, value, icon: Icon, mono }) => (
              <div key={label} className="flex items-center gap-2 rounded-[10px] border border-hair bg-surface-deep px-3 py-2">
                <Icon className="h-3 w-3 text-muted-3" />
                <span className="text-muted-2">{label}</span>
                <span className={cn("text-[12.5px] font-semibold text-text", mono && "font-mono")}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable analysis content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="mx-auto max-w-[900px] space-y-4 px-8 py-7">

          {/* AI model metadata bar */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_10%,var(--surface-deep)),var(--surface-deep))] px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] font-bold text-text">
              <Sparkles className="h-4 w-4 text-accent-lite" />CoachAI Copilot
            </span>
            <span className="text-[12.5px] text-muted-1">Powered by Claude</span>
            <span className="h-[3px] w-[3px] rounded-full bg-[#3B424C]" />
            <span className="text-[12.5px] text-muted-1">Analysed just now</span>
            <span className={cn("ml-auto flex items-center gap-1.5 text-[12px] font-semibold", isReview ? "text-red" : "text-green")}>
              {isReview
                ? <><AlertTriangle className="h-3.5 w-3.5" />Safety flag active</>
                : <><ShieldCheck className="h-3.5 w-3.5" />Engine passed</>
              }
            </span>
          </div>

          {/* Key insight stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InsightStat
              label="Weight trend"
              value={fmtRate(weight.ratePerWeekPct)}
              delta={weightDeltaLabel}
              color={weightColor}
              icon={weightDirIcon}
            />
            <InsightStat
              label="Sleep"
              value={`${latestCheckIn.sleepScore} / 10`}
              delta={latestCheckIn.sleepScore >= 7 ? "Good recovery" : latestCheckIn.sleepScore >= 5 ? "Moderate" : "Below threshold"}
              color={sleepColor(latestCheckIn.sleepScore)}
              icon={Moon}
            />
            <InsightStat
              label="Fatigue"
              value={`${latestCheckIn.fatigueScore} / 10`}
              delta={latestCheckIn.fatigueScore <= 3 ? "Low — well rested" : latestCheckIn.fatigueScore <= 6 ? "Moderate" : "High — monitor"}
              color={fatigueColor(latestCheckIn.fatigueScore)}
              icon={Activity}
            />
            <InsightStat
              label="Cal adherence"
              value={`${Math.round(adherence.calorieRatio * 100)}%`}
              delta={adherence.status === "on_plan" ? "On plan" : adherence.status === "over" ? "Above target" : adherence.status === "under" ? "Below target" : "Unknown"}
              color={adherenceColor(adherence.status)}
              icon={BarChart3}
            />
          </div>

          {/* Safety / warning flags (if any) */}
          {flags.length > 0 && (
            <div className="space-y-2.5">
              {flags.map((flag) => (
                <div
                  key={flag.code}
                  className={cn(
                    "flex items-start gap-3 rounded-[13px] border p-4",
                    flag.severity === "safety"  ? "border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_8%,transparent)]" :
                    flag.severity === "warning" ? "border-[color-mix(in_oklab,var(--amber)_26%,transparent)] bg-[color-mix(in_oklab,var(--amber)_8%,transparent)]" :
                                                  "border-hair bg-surface-deep"
                  )}
                >
                  <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", flag.severity === "safety" ? "text-red" : flag.severity === "warning" ? "text-amber" : "text-muted-2")} />
                  <div>
                    <p className="text-sm font-bold text-text">{flag.title}</p>
                    <p className="mt-0.5 text-xs text-muted-1">{flag.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Client's raw reflection — their own words, shown above the AI's take */}
          <ReflectionCard name={clientInput.name} reflection={latestCheckIn.clientReflection} />

          {/* AI Synthesis card — the one hero: accent gradient + radial glow marks
              it, everything else stays on neutral surfaces. */}
          <section aria-labelledby="synthesis-heading">
            <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--accent)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_6%,var(--surface)),var(--surface))] p-[22px]">
              <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_70%)]" />
              <div className="relative mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-accent-lite">
                    <Bot className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </div>
                  <div>
                    <h2 id="synthesis-heading" className="text-sm font-bold text-text">AI Synthesis</h2>
                    <p className="text-[11.5px] text-muted-1">{clientInput.name} · latest check-in analysis</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-lite">
                  <Sparkles className="h-3 w-3" />Copilot
                </span>
              </div>
              {/* Claude-written coach summary */}
              <p className="relative mb-4 text-[14.5px] leading-[1.7] text-text/90">{aiOutput.coachSummary}</p>
              {/* Engine's plain-language weight vs goal verdict */}
              <div className="relative flex items-start gap-2.5 rounded-[11px] border border-[color-mix(in_oklab,var(--accent)_24%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface-deep))] px-4 py-3">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-accent-lite" />
                <p className="text-[13.5px] text-text/85">
                  <span className="font-bold text-accent-lite">Engine verdict: </span>
                  {weight.vsGoal}
                </p>
              </div>
            </div>
          </section>

          {/* AI Recommendation card — secondary to the Synthesis hero: neutral
              surface, with the semantic badge carrying the only colour. */}
          <section aria-labelledby="recommendation-heading">
            <div className="rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-[34px] w-[34px] items-center justify-center rounded-[9px]",
                    isReview
                      ? "bg-[color-mix(in_oklab,var(--red)_18%,transparent)] text-red"
                      : "bg-[color-mix(in_oklab,var(--green)_18%,transparent)] text-green"
                  )}>
                    <Zap className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </div>
                  <div>
                    <h2 id="recommendation-heading" className="text-sm font-bold text-text">AI Recommendation</h2>
                    <p className="text-[11.5px] text-muted-1">Proposed plan for next microcycle</p>
                  </div>
                </div>
                <div className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                  isReview
                    ? "border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_14%,transparent)] text-red"
                    : "border-[color-mix(in_oklab,var(--green)_26%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] text-green"
                )}>
                  {isReview ? <><AlertTriangle className="h-3 w-3" />Human review required</> : <><ShieldCheck className="h-3 w-3" />Engine recommendation</>}
                </div>
              </div>

              {/* Headline */}
              <p className="text-[16px] font-bold tracking-[-0.01em] text-text">{recommendation.headline}</p>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-muted-1">{recommendation.rationale}</p>

              {/* Do / Don't guidance */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[color-mix(in_oklab,var(--red)_22%,transparent)] bg-[color-mix(in_oklab,var(--red)_6%,transparent)] p-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-red">
                    <AlertTriangle className="h-3.5 w-3.5" />Do not
                  </div>
                  <ul className="mt-2.5 space-y-2 text-[13px] text-text/80">
                    {guidance.dont.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[color-mix(in_oklab,var(--green)_22%,transparent)] bg-[color-mix(in_oklab,var(--green)_6%,transparent)] p-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-green">
                    <CheckCircle2 className="h-3.5 w-3.5" />Recommend
                  </div>
                  <ul className="mt-2.5 space-y-2 text-[13px] text-text/80">
                    {guidance.do.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Macro editor — shown when AI proposed or coach opened manually */}
              {editedMacros && (
                <div className="mt-4 rounded-xl border border-hair bg-surface-deep p-4">
                  <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.07em] text-accent-lite">
                    {recommendation.proposedMacros
                      ? 'Proposed macro update — review & confirm before approving'
                      : 'Manual macro edit — adjust targets before approving'}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: 'protein', label: 'Protein', labelColor: 'text-macro-protein', current: clientInput.targetProtein },
                      { key: 'carbs',   label: 'Carbs',   labelColor: 'text-macro-carbs',   current: clientInput.targetCarbs },
                      { key: 'fats',    label: 'Fats',    labelColor: 'text-macro-fats',     current: clientInput.targetFats },
                    ] as const).map(({ key, label, labelColor, current }) => (
                      <div key={key}>
                        <label className={cn('mb-2 block text-xs font-semibold', labelColor)}>
                          {label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editedMacros[key]}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setEditedMacros((prev) =>
                                prev ? { ...prev, [key]: isNaN(val) ? 0 : Math.max(0, val) } : prev,
                              );
                              setMacroWarningsAcknowledged(false);
                            }}
                            disabled={approved}
                            className="w-full rounded-[10px] border border-white/10 bg-bg py-2.5 pl-3 pr-8 font-mono text-[15px] font-semibold tabular-nums text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:opacity-50"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-2">
                            g
                          </span>
                        </div>
                        <p className="mt-1.5 font-mono text-[11px] text-muted-2">
                          was {current} g
                        </p>
                      </div>
                    ))}
                  </div>
                  {!macrosValid && (
                    <p className="mt-2 text-xs text-red">
                      All macro values must be 0 or greater before you can approve.
                    </p>
                  )}
                  {macroWarnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {macroWarnings.map((w, i) => (
                        <p key={i} className="text-xs text-red">{w}</p>
                      ))}
                    </div>
                  )}
                  {macroWarnings.length > 0 && (
                    <label
                      htmlFor="macro-warnings-ack"
                      className="mt-3 flex cursor-pointer select-none items-center gap-2.5"
                    >
                      <input
                        id="macro-warnings-ack"
                        type="checkbox"
                        checked={macroWarningsAcknowledged}
                        onChange={(e) => setMacroWarningsAcknowledged(e.target.checked)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[var(--accent)]"
                      />
                      <span className={cn(
                        "text-xs font-medium leading-snug",
                        macroWarningsAcknowledged ? "text-text" : "text-red",
                      )}>
                        I&apos;ve reviewed these macro values and am proceeding with my own judgment
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* No proposal & not manually editing — hold current targets. Derived
                  purely from existing state (editedMacros); no fabricated data. */}
              {!editedMacros && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-hair bg-surface-deep px-4 py-3 text-[13px] text-muted-1">
                  <CheckCircle2 className="h-[15px] w-[15px] shrink-0 text-green" />
                  No macro change proposed this week — hold current targets.
                </div>
              )}

              {/* Client message — editable before approving */}
              {aiOutput.clientMessage && (
                <div className="mt-4 rounded-xl border border-hair bg-surface-deep p-4">
                  <div className="mb-2.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#C7CDD6]">
                      <MessageSquare className="h-3.5 w-3.5" />Client message — edit before approving
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-muted-2">
                      {editedMessage.length}/1000
                    </span>
                  </div>
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    disabled={approved}
                    placeholder="Write a message for the client…"
                    className={cn(
                      "w-full resize-y rounded-[10px] border border-white/10 bg-bg px-3.5 py-3 text-[13.5px] leading-[1.6] text-text",
                      "placeholder:text-muted-3 transition-colors",
                      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring",
                      "disabled:opacity-50",
                      !messageValid && "border-red focus:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]",
                    )}
                  />
                  {!messageValid && (
                    <p className="mt-1.5 text-xs text-red">Message cannot be empty.</p>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* ── Sticky action footer ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-hair bg-sidebar px-8 py-4">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4">
          {approved ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-green">
              <CheckCircle2 className="h-4 w-4" />
              Plan approved and saved for {clientInput.name}
            </p>
          ) : isReview ? (
            <label htmlFor="safety-ack" className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2.5 pr-4">
              <input
                id="safety-ack"
                type="checkbox"
                checked={safetyAcknowledged}
                onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[var(--accent)]"
              />
              <span className={cn("text-xs font-medium leading-snug", safetyAcknowledged ? "text-text" : "text-red")}>
                I&apos;ve reviewed this safety flag and am proceeding with my own judgment
              </span>
            </label>
          ) : (
            <p className="flex items-center gap-2 text-[13px]">
              <span className="font-semibold text-text">{clientInput.name}</span>
              <span className="text-muted-2">·</span>
              <span className="flex items-center gap-1.5 text-amber">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />Awaiting approval
              </span>
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2.5">
            {/* Hidden when AI already proposed macros (fields already visible)
                or after approval — only needed for the no-proposal case */}
            {!recommendation.proposedMacros && !approved && (
              <button
                type="button"
                onClick={() => {
                  if (manualEditOpen) {
                    setManualEditOpen(false);
                    setEditedMacros(null);
                  } else {
                    setManualEditOpen(true);
                    setEditedMacros({
                      protein: clientInput.targetProtein,
                      carbs:   clientInput.targetCarbs,
                      fats:    clientInput.targetFats,
                    });
                  }
                }}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-[11px] border border-hair-2 bg-surface-3 px-4 text-[13.5px] font-bold text-[#C7CDD6]",
                  "transition-colors hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                )}
              >
                {manualEditOpen ? (
                  <><XCircle className="h-4 w-4" strokeWidth={2} />Cancel</>
                ) : (
                  <><Pencil className="h-4 w-4" strokeWidth={2} />Edit plan manually</>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onApprove(editedMacros, editedMessage.trim())}
              disabled={approving || approved || (isReview && !safetyAcknowledged) || !macrosValid || !messageValid || (macroWarnings.length > 0 && !macroWarningsAcknowledged)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-[11px] px-5 text-[13.5px] font-bold text-white",
                "transition-[filter,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                "disabled:cursor-not-allowed disabled:opacity-60",
                approved
                  ? "bg-green shadow-[0_10px_26px_-12px_color-mix(in_oklab,var(--green)_90%,transparent)]"
                  : "bg-accent shadow-[0_10px_26px_-12px_color-mix(in_oklab,var(--accent)_90%,transparent)] hover:brightness-110"
              )}
            >
              {approving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Approving…</>
              ) : approved ? (
                <><CheckCircle2 className="h-4 w-4" />Approved</>
              ) : (
                <><Send className="h-4 w-4" strokeWidth={2} />Approve plan</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Approved (read-only) panel ────────────────────────────────────────────────

function ApprovedPanel({
  client,
  savedAnalysis,
}: {
  client: QueueClientData;
  savedAnalysis: NonNullable<QueueClientData['savedAnalysis']>;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Client context bar */}
      <div className="shrink-0 border-b border-hair bg-sidebar px-8 py-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_20%,#14161B)] text-[15px] font-bold text-accent-lite">
            {client.initials}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[19px] font-extrabold tracking-[-0.01em] text-text">{client.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[color-mix(in_oklab,var(--green)_28%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />Approved
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-1">
              Check-in from {savedAnalysis.approvedAt}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="mx-auto max-w-[900px] space-y-4 px-8 py-7">

          {/* Read-only notice */}
          <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--green)_22%,transparent)] bg-[color-mix(in_oklab,var(--green)_8%,transparent)] px-4 py-3.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
            <p className="text-xs font-semibold text-green">
              This check-in has been approved. Showing the analysis saved at approval — no new AI call has been made.
            </p>
          </div>

          {/* Reflection attention flag saved at approval (if one was raised) */}
          {(() => {
            const flag = attentionFlag(savedAnalysis.attention);
            if (!flag) return null;
            return (
              <div className="flex items-start gap-3 rounded-[13px] border border-[color-mix(in_oklab,var(--amber)_26%,transparent)] bg-[color-mix(in_oklab,var(--amber)_8%,transparent)] p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <div>
                  <p className="text-sm font-bold text-text">{flag.title}</p>
                  <p className="mt-0.5 text-xs text-muted-1">{flag.detail}</p>
                </div>
              </div>
            );
          })()}

          {/* Client's raw reflection — their own words, shown above the AI's take */}
          <ReflectionCard name={client.name} reflection={savedAnalysis.clientReflection} />

          {/* Saved AI synthesis */}
          <section>
            <div className="overflow-hidden rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-accent-lite">
                    <Bot className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text">AI Synthesis</h2>
                    <p className="text-[11.5px] text-muted-1">{client.name} · saved at approval</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_oklab,var(--green)_28%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-green">
                  <CheckCircle2 className="h-3 w-3" />Approved
                </span>
              </div>
              {savedAnalysis.coachSummary ? (
                <p className="text-[14.5px] leading-[1.7] text-text/90">{savedAnalysis.coachSummary}</p>
              ) : (
                <p className="text-sm italic text-muted-2">No coach summary was saved.</p>
              )}
            </div>
          </section>

          {/* Saved client message */}
          {savedAnalysis.clientMessage && (
            <section>
              <div className="rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
                  <MessageSquare className="h-4 w-4 text-muted-2" strokeWidth={2} />Client message sent
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-[1.6] text-text/85">
                  {savedAnalysis.clientMessage}
                </p>
              </div>
            </section>
          )}

          {/* Macro targets */}
          <section>
            <div className="rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
                <Target className="h-4 w-4 text-muted-2" strokeWidth={2} />Macro targets at approval
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Protein', value: savedAnalysis.macros.protein, color: 'text-macro-protein' },
                  { label: 'Carbs',   value: savedAnalysis.macros.carbs,   color: 'text-macro-carbs' },
                  { label: 'Fats',    value: savedAnalysis.macros.fats,    color: 'text-macro-fats' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-hair bg-surface-deep p-3.5 text-center">
                    <p className={cn('mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]', color)}>{label}</p>
                    <p className="font-mono text-[26px] font-medium tabular-nums text-text">{value}</p>
                    <p className="text-[10px] text-muted-2">g / day</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Footer — no approve button */}
      <div className="shrink-0 border-t border-hair bg-sidebar px-8 py-4">
        <div className="mx-auto flex max-w-[900px] items-center">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-green">
            <CheckCircle2 className="h-4 w-4" />
            Plan approved and saved · {savedAnalysis.approvedAt}
          </p>
        </div>
      </div>
    </div>
  );
}

function ApprovedFallbackPanel({ client }: { client: QueueClientData }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-hair bg-sidebar px-8 py-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_20%,#14161B)] text-[15px] font-bold text-accent-lite">
            {client.initials}
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[17px] font-bold text-text">{client.name}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[color-mix(in_oklab,var(--green)_28%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />Approved
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-bg px-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-[color-mix(in_oklab,var(--green)_45%,transparent)]" />
        <p className="text-sm font-bold text-muted-1">Check-in approved</p>
        <p className="max-w-sm text-xs text-muted-2">
          This check-in was approved but the saved analysis could not be loaded.
        </p>
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function AICheckInsClient({ queueClients }: { queueClients: QueueClientData[] }) {
  const searchParams = useSearchParams();
  const paramId = searchParams.get("clientId");
  const initialId = (paramId && queueClients.some((c) => c.id === paramId))
    ? paramId
    : (queueClients[0]?.id ?? null);

  // Whether the initially-selected client needs an AI analysis fetched on mount.
  // Approved clients show their saved analysis instead, so they never fetch.
  const initialClient = initialId ? queueClients.find((c) => c.id === initialId) : undefined;
  const autoFetchOnMount = !!initialId && initialClient?.status !== CHECK_IN_STATUS.Approved;

  const [localQueue, setLocalQueue] = useState<QueueClientData[]>(queueClients);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  // Seed `loading` from the mount decision so the effect below never has to call
  // setState synchronously (which would trigger a cascading render).
  const [loading, setLoading] = useState(autoFetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // Fetch the analysis for the selected client. Keying the effect on selectedId
  // routes every fetch — the initial mount and each later switch — through here.
  // All setState runs inside the promise callbacks (never synchronously in the
  // effect body), and a stale-response guard stops rapid switches from clobbering
  // each other. Approved clients render saved data, so they are skipped.
  useEffect(() => {
    if (!selectedId) return;
    const client = localQueue.find((c) => c.id === selectedId);
    if (client?.status === CHECK_IN_STATUS.Approved) return;

    let ignore = false;
    fetch(`/api/checkin-analysis?clientId=${encodeURIComponent(selectedId)}`)
      .then(async (res) => ({ ok: res.ok, json: await res.json() }))
      .then(({ ok, json }) => {
        if (ignore) return;
        if (!ok) setError(json.error ?? "An unexpected error occurred.");
        else setAnalysis(json as AnalysisResult);
      })
      .catch(() => {
        if (!ignore) setError("Network error — could not reach the analysis API.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [selectedId, localQueue]);

  const handleSelect = (id: string) => {
    // Already open — nothing to reset or refetch. Without this guard the resets
    // below still run, but the fetch effect (keyed on selectedId + localQueue)
    // sees no changed dep and never re-runs, leaving loading=true with no
    // request in flight — a spinner that never resolves. Matters because the
    // first queue row is auto-selected on mount, so clicking it to "open" it
    // hits exactly this case.
    if (id === selectedId) return;

    setSelectedId(id);
    window.history.replaceState(null, '', `?clientId=${encodeURIComponent(id)}`);
    const client = localQueue.find((c) => c.id === id);
    // Reset the panel immediately — setState in an event handler is fine. The
    // effect above then fetches for non-approved clients; approved clients show
    // their saved analysis, so no AI call is made.
    const isApproved = client?.status === CHECK_IN_STATUS.Approved;
    setError(null);
    setAnalysis(null);
    setApproved(false);
    setLoading(!isApproved);
  };

  // Mobile master-detail: return from a client's review to the queue.
  const handleBack = () => {
    setSelectedId(null);
    window.history.replaceState(null, '', '/ai-check-ins');
    setError(null);
    setAnalysis(null);
    setApproved(false);
    setLoading(false);
  };

  // POST to approve the current check-in
  const handleApprove = async (confirmedMacros: ConfirmedMacros | null, clientMessage: string) => {
    if (!analysis) return;
    setApproving(true);
    try {
      const res = await fetch("/api/checkin-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId:    analysis.latestCheckInId,
          coachSummary: analysis.aiOutput.coachSummary,
          clientMessage,
          confirmedMacros,
          attention:    analysis.aiOutput.attention,
        }),
      });
      if (res.ok) {
        setApproved(true);
        // Update local queue so re-selecting this client shows the saved panel
        setLocalQueue((prev) =>
          prev.map((c) => {
            if (c.id !== analysis.clientInput.id) return c;
            return {
              ...c,
              status: CHECK_IN_STATUS.Approved,
              savedAnalysis: {
                checkInId:        analysis.latestCheckInId,
                coachSummary:     analysis.aiOutput.coachSummary,
                clientMessage,
                clientReflection: analysis.latestCheckIn.clientReflection,
                attention:        analysis.aiOutput.attention,
                macros: {
                  protein: confirmedMacros?.protein ?? analysis.clientInput.targetProtein,
                  carbs:   confirmedMacros?.carbs   ?? analysis.clientInput.targetCarbs,
                  fats:    confirmedMacros?.fats     ?? analysis.clientInput.targetFats,
                },
                approvedAt: new Date().toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                }),
              },
            };
          }),
        );
      } else {
        const json = await res.json();
        setError(json.error ?? "Approval failed.");
      }
    } catch {
      setError("Network error — could not reach the approve API.");
    } finally {
      setApproving(false);
    }
  };

  const selectedClient = localQueue.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      {/* Mobile only (≤860px): back to the queue from an open review. */}
      {selectedId && (
        <button
          type="button"
          onClick={handleBack}
          className="flex shrink-0 items-center gap-2 border-b border-hair bg-sidebar px-4 py-3 text-sm font-semibold text-nav transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring min-[860px]:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          Back to queue
        </button>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftPanel
          clients={localQueue}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* Right panel: loading / error / approved / analysis / empty */}
        {loading ? (
          <LoadingPanel name={selectedClient?.name ?? "client"} />
        ) : error ? (
          <ErrorPanel message={error} />
        ) : selectedClient?.status === CHECK_IN_STATUS.Approved ? (
          selectedClient.savedAnalysis ? (
            <ApprovedPanel client={selectedClient} savedAnalysis={selectedClient.savedAnalysis} />
          ) : (
            <ApprovedFallbackPanel client={selectedClient} />
          )
        ) : analysis ? (
          <AnalysisPanel
            data={analysis}
            onApprove={handleApprove}
            approving={approving}
            approved={approved}
          />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  );
}
