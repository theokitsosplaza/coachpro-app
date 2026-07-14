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
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { CHECK_IN_STATUS, type CheckInStatus } from "@/lib/check-in-status";

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
  };
};

// ── Colour helpers ────────────────────────────────────────────────────────────

const FLAG_STYLES: Record<FlagColor, string> = {
  danger:  "bg-anomaly-muted text-anomaly border-anomaly/25",
  warning: "bg-warning-muted text-warning border-warning/30",
  success: "bg-success-muted text-success border-success/25",
  neutral: "bg-muted text-muted-foreground border-border",
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

function triageColor(t: string): FlagColor {
  const m: Record<string, FlagColor> = { red: "danger", yellow: "warning", green: "success", grey: "neutral" };
  return m[t] ?? "neutral";
}

function adherenceColor(status: string): FlagColor {
  if (status === "on_plan") return "success";
  if (status === "unknown") return "neutral";
  return "warning";
}

function severityColor(s: string): FlagColor {
  if (s === "safety") return "danger";
  if (s === "warning") return "warning";
  return "neutral";
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "N/A";
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(2)}%/wk`;
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
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", FLAG_STYLES[color])}>
      {label}
    </span>
  );
}

function InsightStat({ label, value, delta, color, icon: Icon }: {
  label: string; value: string; delta?: string; color: FlagColor; icon: typeof Scale;
}) {
  const border: Record<FlagColor, string> = {
    danger:  "border-anomaly/30 bg-anomaly-muted/40",
    warning: "border-warning/30 bg-warning-muted/40",
    success: "border-success/25 bg-success-muted/30",
    neutral: "border-border bg-muted/20",
  };
  const text: Record<FlagColor, string> = {
    danger: "text-anomaly", warning: "text-warning", success: "text-success", neutral: "text-foreground",
  };
  return (
    <div className={cn("rounded-lg border p-3.5", border[color])}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className={cn("mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight", text[color])}>{value}</p>
      {delta && <p className="mt-1 text-[11px] text-muted-foreground">{delta}</p>}
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
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <Quote className="h-4 w-4 text-accent" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">In {name}&apos;s own words</h2>
            <p className="text-[11px] text-muted-foreground">The client&apos;s written reflection for this check-in</p>
          </div>
        </div>
        <div className="px-5 py-4">
          {text ? (
            <blockquote className="whitespace-pre-wrap border-l-2 border-accent/40 pl-4 text-[15px] leading-relaxed text-foreground/90">
              {text}
            </blockquote>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No written reflection was included with this check-in.
            </p>
          )}
        </div>
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

  function queueFlag(status: CheckInStatus | 'none'): { label: string; color: FlagColor } {
    if (status === CHECK_IN_STATUS.Approved) return { label: "Approved",       color: "success" };
    if (status === CHECK_IN_STATUS.Pending)  return { label: "Pending Review", color: "warning" };
    return                                          { label: "No submission",  color: "neutral" };
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card xl:w-96">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-secondary">Check-in Queue</h2>
          {pending > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-bold tabular-nums text-accent-foreground">
              {pending}
            </span>
          )}
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono tabular-nums text-secondary">{clients.length}</span> clients ·{" "}
          <span className="font-mono tabular-nums text-secondary">{pending}</span> pending review
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No check-ins in the queue yet.
          </p>
        )}
        {clients.map((client) => {
          const isSelected = client.id === selectedId;
          const flag = queueFlag(client.status);
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client.id)}
              className={cn(
                "group w-full border-b border-border/60 px-5 py-4 text-left transition-colors",
                isSelected
                  ? "border-l-2 border-l-accent bg-accent/8"
                  : "border-l-2 border-l-transparent hover:bg-muted/40"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                  isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {client.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[15px] font-semibold tracking-[-0.005em]", isSelected ? "text-foreground" : "text-foreground/80")}>
                      {client.name}
                    </span>
                    {client.submittedAt && (
                      <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(client.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <FlagBadge label={flag.label} color={flag.color} />
                  </div>
                </div>
              </div>
              {client.status === CHECK_IN_STATUS.Approved && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <CheckCircle2 className="h-3 w-3" />Reviewed
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ── Loading panel ─────────────────────────────────────────────────────────────

function LoadingPanel({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Analysing {name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Running engine + Claude — this takes a few seconds</p>
      </div>
    </div>
  );
}

// ── Error panel ───────────────────────────────────────────────────────────────

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-anomaly/30 bg-anomaly-muted">
        <XCircle className="h-6 w-6 text-anomaly" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Could not generate analysis</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ── Empty / no client selected ────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Select a client from the queue to run the AI analysis</p>
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
  const { clientInput, latestCheckIn, synthesis, aiOutput } = data;
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
  const weightColor = triageColor(synthesis.triage);
  const weightDirIcon = weight.direction === "losing" ? TrendingDown : weight.direction === "gaining" ? TrendingUp : Minus;
  const guidance = ACTION_GUIDANCE[recommendation.action] ?? ACTION_GUIDANCE["hold"];
  const isReview = recommendation.action === "review";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Client context bar ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[15px] font-bold text-accent">
              {clientInput.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">{clientInput.name}</h1>
                {isReview ? (
                  <span className="rounded-full border border-anomaly/30 bg-anomaly-muted px-2 py-0.5 text-[10px] font-semibold text-anomaly">
                    Safety Review
                  </span>
                ) : latestCheckIn.status === CHECK_IN_STATUS.Approved ? (
                  <span className="rounded-full border border-success/30 bg-success-muted px-2 py-0.5 text-[10px] font-semibold text-success">
                    Approved
                  </span>
                ) : (
                  <span className="rounded-full border border-warning/30 bg-warning-muted px-2 py-0.5 text-[10px] font-semibold text-warning">
                    Pending Review
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {clientInput.currentPhase ?? clientInput.goal}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { label: "Goal", value: clientInput.goal, icon: Target },
              { label: "Protein target", value: `${clientInput.targetProtein} g/day`, icon: Activity },
              { label: "Submitted", value: new Date(latestCheckIn.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable analysis content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 xl:px-8">

          {/* AI model metadata bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="h-3 w-3 text-accent" />CoachAI Copilot
            </span>
            <span>Powered by Claude</span>
            <span>·</span>
            <span>Analysed just now</span>
            <span>·</span>
            <span className={cn("flex items-center gap-1 font-semibold", isReview ? "text-anomaly" : "text-success")}>
              {isReview
                ? <><AlertTriangle className="h-3 w-3" />Safety flag active</>
                : <><ShieldCheck className="h-3 w-3" />Engine passed</>
              }
            </span>
          </div>

          {/* Key insight stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InsightStat
              label="Weight trend"
              value={fmtRate(weight.ratePerWeekPct)}
              delta={weight.latest ? `Latest: ${weight.latest} kg` : undefined}
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
            <div className="space-y-2">
              {flags.map((flag) => (
                <div
                  key={flag.code}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    flag.severity === "safety"  ? "border-anomaly/30 bg-anomaly-muted/40" :
                    flag.severity === "warning" ? "border-warning/30 bg-warning-muted/40" :
                                                  "border-border bg-muted/20"
                  )}
                >
                  <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", flag.severity === "safety" ? "text-anomaly" : flag.severity === "warning" ? "text-warning" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{flag.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{flag.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Client's raw reflection — their own words, shown above the AI's take */}
          <ReflectionCard name={clientInput.name} reflection={latestCheckIn.clientReflection} />

          {/* AI Synthesis card — the one hero: a single accent top edge marks it,
              everything else stays on neutral surfaces. */}
          <section aria-labelledby="synthesis-heading">
            <div className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
              <div className="h-0.5 bg-gradient-to-r from-accent to-accent/0" aria-hidden />
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft ring-1 ring-inset ring-accent/25">
                  <Bot className="h-4 w-4 text-accent" strokeWidth={2} />
                </div>
                <div>
                  <h2 id="synthesis-heading" className="text-sm font-semibold text-foreground">AI Synthesis</h2>
                  <p className="text-[11px] text-muted-foreground">{clientInput.name} · latest check-in analysis</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent ring-1 ring-inset ring-accent/25">
                  <Sparkles className="h-3 w-3" />Copilot
                </span>
              </div>
              <div className="space-y-4 px-5 py-5">
                {/* Claude-written coach summary */}
                <p className="text-[15px] leading-7 text-foreground/90">{aiOutput.coachSummary}</p>
                {/* Engine's plain-language weight vs goal verdict */}
                <div className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Scale className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-sm text-foreground/90">
                      <span className="font-semibold text-accent">Engine verdict: </span>
                      {weight.vsGoal}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Recommendation card — secondary to the Synthesis hero: neutral
              surface, with the semantic badge carrying the only colour. */}
          <section aria-labelledby="recommendation-heading">
            <div className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-secondary">
                  <Zap className="h-4 w-4" strokeWidth={2} />
                </div>
                <div>
                  <h2 id="recommendation-heading" className="text-sm font-semibold text-foreground">AI Recommendation</h2>
                  <p className="text-[11px] text-muted-foreground">Proposed plan for next microcycle</p>
                </div>
                <div className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  isReview
                    ? "border-anomaly/30 bg-anomaly-muted text-anomaly"
                    : "border-success/30 bg-success-muted text-success"
                )}>
                  {isReview ? <><AlertTriangle className="h-3 w-3" />Human review required</> : <><ShieldCheck className="h-3 w-3" />Engine recommendation</>}
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                {/* Headline */}
                <p className="text-sm font-semibold text-foreground">{recommendation.headline}</p>
                <p className="text-sm text-muted-foreground">{recommendation.rationale}</p>

                {/* Do / Don't guidance */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-anomaly/25 bg-anomaly-muted/30 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-anomaly">
                      <AlertTriangle className="h-3.5 w-3.5" />Do not
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                      {guidance.dont.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-anomaly" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-success/25 bg-success-muted/30 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />Recommend
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                      {guidance.do.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Macro editor — shown when AI proposed or coach opened manually */}
                {editedMacros && (
                  <div className="rounded-lg border border-accent/25 bg-accent/5 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
                          <label className={cn('mb-1.5 block text-xs font-semibold', labelColor)}>
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
                              className="w-full rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm font-semibold tabular-nums text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              g
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            was {current} g
                          </p>
                        </div>
                      ))}
                    </div>
                    {!macrosValid && (
                      <p className="mt-2 text-xs text-anomaly">
                        All macro values must be 0 or greater before you can approve.
                      </p>
                    )}
                    {macroWarnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {macroWarnings.map((w, i) => (
                          <p key={i} className="text-xs text-anomaly">{w}</p>
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
                          className="h-4 w-4 shrink-0 cursor-pointer rounded"
                        />
                        <span className={cn(
                          "text-xs font-medium leading-snug",
                          macroWarningsAcknowledged ? "text-foreground" : "text-anomaly",
                        )}>
                          I&apos;ve reviewed these macro values and am proceeding with my own judgment
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Client message — editable before approving */}
                {aiOutput.clientMessage && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />Client message — edit before approving
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
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
                        "w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground",
                        "placeholder:text-muted-foreground/50 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "disabled:opacity-50",
                        !messageValid && "border-anomaly focus:ring-anomaly/30",
                      )}
                    />
                    {!messageValid && (
                      <p className="mt-1.5 text-xs text-anomaly">Message cannot be empty.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="h-2" />
        </div>
      </div>

      {/* ── Sticky action footer ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 xl:px-2">
          {approved ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
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
                className="h-4 w-4 shrink-0 cursor-pointer rounded"
              />
              <span className={cn("text-xs font-medium leading-snug", safetyAcknowledged ? "text-foreground" : "text-anomaly")}>
                I&apos;ve reviewed this safety flag and am proceeding with my own judgment
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{clientInput.name}</span> ·{" "}
              <span className="text-warning">Awaiting approval</span>
            </p>
          )}
          <div className="flex items-center gap-2.5">
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
                  "inline-flex h-11 items-center gap-2 rounded-lg border px-5 text-sm font-semibold",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  manualEditOpen
                    ? "border-border bg-surface-3 text-secondary hover:bg-surface-3 hover:text-foreground"
                    : "border-border bg-surface-2 text-foreground hover:border-border-strong hover:bg-surface-3"
                )}
              >
                {manualEditOpen ? (
                  <><XCircle className="h-4 w-4" strokeWidth={2} />Cancel</>
                ) : (
                  <><Pencil className="h-4 w-4" strokeWidth={2} />Edit Plan Manually</>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onApprove(editedMacros, editedMessage.trim())}
              disabled={approving || approved || (isReview && !safetyAcknowledged) || !macrosValid || !messageValid || (macroWarnings.length > 0 && !macroWarningsAcknowledged)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-semibold",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                approved
                  ? "bg-success text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_2px_10px_-2px_rgba(52,211,153,0.4)]"
                  : isReview && !safetyAcknowledged
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_2px_10px_-2px_rgba(77,124,254,0.45)] hover:bg-accent-hover active:bg-accent-press"
              )}
            >
              {approving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Approving…</>
              ) : approved ? (
                <><CheckCircle2 className="h-4 w-4" />Approved</>
              ) : (
                <><Send className="h-4 w-4" strokeWidth={2} />Approve Plan</>
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
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[15px] font-bold text-accent">
            {client.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">{client.name}</h1>
              <span className="rounded-full border border-success/30 bg-success-muted px-2 py-0.5 text-[10px] font-semibold text-success">
                Approved
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Check-in from {savedAnalysis.approvedAt}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 xl:px-8">

          {/* Read-only notice */}
          <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success-muted/30 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <p className="text-xs font-medium text-success">
              This check-in has been approved. Showing the analysis saved at approval — no new AI call has been made.
            </p>
          </div>

          {/* Client's raw reflection — their own words, shown above the AI's take */}
          <ReflectionCard name={client.name} reflection={savedAnalysis.clientReflection} />

          {/* Saved AI synthesis */}
          <section>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
              <div className="h-0.5 bg-gradient-to-r from-accent to-accent/0" aria-hidden />
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft ring-1 ring-inset ring-accent/25">
                  <Bot className="h-4 w-4 text-accent" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI Synthesis</h2>
                  <p className="text-[11px] text-muted-foreground">{client.name} · saved at approval</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-success">
                  <CheckCircle2 className="h-3 w-3" />Approved
                </span>
              </div>
              <div className="px-5 py-5">
                {savedAnalysis.coachSummary ? (
                  <p className="text-[15px] leading-7 text-foreground/90">{savedAnalysis.coachSummary}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No coach summary was saved.</p>
                )}
              </div>
            </div>
          </section>

          {/* Saved client message */}
          {savedAnalysis.clientMessage && (
            <section>
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-foreground">Client message sent</h2>
                </div>
                <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-foreground/90">
                  {savedAnalysis.clientMessage}
                </p>
              </div>
            </section>
          )}

          {/* Macro targets */}
          <section>
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                <Target className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-foreground">Macro targets at approval</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-5">
                {[
                  { label: 'Protein', value: savedAnalysis.macros.protein, color: 'text-macro-protein' },
                  { label: 'Carbs',   value: savedAnalysis.macros.carbs,   color: 'text-macro-carbs' },
                  { label: 'Fats',    value: savedAnalysis.macros.fats,    color: 'text-macro-fats' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className={cn('mb-1 text-[10px] font-semibold', color)}>{label}</p>
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground">g / day</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="h-2" />
        </div>
      </div>

      {/* Footer — no approve button */}
      <div className="shrink-0 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center xl:px-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
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
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[15px] font-bold text-accent">
            {client.initials}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">{client.name}</h1>
            <span className="rounded-full border border-success/30 bg-success-muted px-2 py-0.5 text-[10px] font-semibold text-success">
              Approved
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-success/40" />
        <p className="text-sm font-semibold text-muted-foreground">Check-in approved</p>
        <p className="max-w-sm text-xs text-muted-foreground">
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 overflow-hidden">
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
