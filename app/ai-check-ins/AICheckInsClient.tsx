"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
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
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlagColor = "danger" | "warning" | "success" | "neutral";

// Passed in from the server component (page.tsx)
export type QueueClientData = {
  id: string;
  name: string;
  initials: string;
  submittedAt: string | null; // null when the client has no check-ins
  status: string;             // "pending" | "approved" | "none"
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
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", FLAG_STYLES[color])}>
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
    <div className={cn("rounded-lg border p-3", border[color])}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums tracking-tight", text[color])}>{value}</p>
      {delta && <p className="mt-0.5 text-[10px] text-muted-foreground">{delta}</p>}
    </div>
  );
}

// ── Left panel (queue) ────────────────────────────────────────────────────────

function LeftPanel({ clients, selectedId, onSelect }: {
  clients: QueueClientData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pending = clients.filter((c) => c.status === "pending").length;

  function queueFlag(status: string): { label: string; color: FlagColor } {
    if (status === "approved") return { label: "Approved", color: "success" };
    if (status === "pending")  return { label: "Pending Review", color: "warning" };
    return { label: "No submission", color: "neutral" };
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card xl:w-96">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Check-in Queue</h2>
          {pending > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {pending}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {clients.length} clients · {pending} pending review
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No clients found. Run <code className="rounded bg-muted px-1 text-xs">/api/seed</code> to create some.
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
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {client.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-foreground/80")}>
                      {client.name}
                    </span>
                    {client.submittedAt && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />{client.submittedAt}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <FlagBadge label={flag.label} color={flag.color} />
                  </div>
                </div>
              </div>
              {client.status === "approved" && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
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

function AnalysisPanel({
  data,
  onApprove,
  approving,
  approved,
}: {
  data: AnalysisResult;
  onApprove: () => void;
  approving: boolean;
  approved: boolean;
}) {
  const { clientInput, latestCheckIn, synthesis, aiOutput } = data;
  const { recommendation, flags, weight, adherence } = synthesis;

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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-muted text-sm font-bold text-accent">
              {clientInput.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">{clientInput.name}</h1>
                {isReview ? (
                  <span className="rounded-full border border-anomaly/30 bg-anomaly-muted px-2 py-0.5 text-[10px] font-semibold text-anomaly">
                    Safety Review
                  </span>
                ) : latestCheckIn.status === "approved" ? (
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
          <div className="flex flex-wrap gap-2 text-[11px]">
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
            <span>Claude claude-sonnet-4-6</span>
            <span>·</span>
            <span>Analysed just now</span>
            <span>·</span>
            <span className={cn("flex items-center gap-1 font-semibold", isReview ? "text-anomaly" : "text-success")}>
              {isReview
                ? <><AlertTriangle className="h-3 w-3" />Safety flag active</>
                : <><ShieldCheck className="h-3 w-3" />Engine passed</>
              }
            </span>
            <button type="button" className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
              <RotateCcw className="h-3 w-3" />Regenerate
            </button>
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

          {/* AI Synthesis card */}
          <section aria-labelledby="synthesis-heading">
            <div className="rounded-xl border border-accent/35 bg-card shadow-lg shadow-accent/8 ring-1 ring-accent/15">
              <div className="flex items-center gap-3 rounded-t-xl border-b border-accent/20 bg-gradient-to-r from-accent/12 to-transparent px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-md shadow-accent/30">
                  <Bot className="h-4 w-4 text-accent-foreground" strokeWidth={2} />
                </div>
                <div>
                  <h2 id="synthesis-heading" className="text-sm font-semibold text-foreground">AI Synthesis</h2>
                  <p className="text-[11px] text-muted-foreground">{clientInput.name} · latest check-in analysis</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  <Sparkles className="h-3 w-3" />Copilot
                </span>
              </div>
              <div className="space-y-4 px-5 py-5">
                {/* Claude-written coach summary */}
                <p className="leading-7 text-foreground/90">{aiOutput.coachSummary}</p>
                {/* Engine's plain-language weight vs goal verdict */}
                <div className="rounded-lg border border-accent/20 bg-accent/6 px-4 py-3">
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

          {/* AI Recommendation card */}
          <section aria-labelledby="recommendation-heading">
            <div className="rounded-xl border border-accent/40 bg-card shadow-lg shadow-accent/10 ring-1 ring-accent/20">
              <div className="flex items-center gap-3 rounded-t-xl border-b border-accent/25 bg-gradient-to-r from-accent/15 to-transparent px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                  <Zap className="h-4 w-4 text-accent" strokeWidth={2} />
                </div>
                <div>
                  <h2 id="recommendation-heading" className="text-sm font-semibold text-foreground">AI Recommendation</h2>
                  <p className="text-[11px] text-muted-foreground">Proposed plan for next microcycle</p>
                </div>
                <div className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
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

                {/* Proposed macros (only shown when engine produced them) */}
                {recommendation.proposedMacros && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Proposed macro update — approve to apply
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(["protein", "carbs", "fats"] as const).map((macro) => (
                        <div key={macro} className="flex items-center gap-1.5">
                          <span className="text-xs font-medium capitalize text-muted-foreground">{macro}:</span>
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {recommendation.proposedMacros![macro]} g
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Claude-written client message preview */}
                {aiOutput.clientMessage && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />Ready-to-send client message
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85 italic">
                      &ldquo;{aiOutput.clientMessage}&rdquo;
                    </p>
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
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{clientInput.name}</span> ·{" "}
              {isReview
                ? <span className="text-anomaly font-medium">Safety brake active — human review required</span>
                : <span className="text-warning">Awaiting approval</span>
              }
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground",
                "transition-colors hover:border-accent/40 hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />Edit Plan Manually
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={approving || approved || isReview}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-bold",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "transition-all active:scale-[0.98]",
                approved
                  ? "bg-success text-white shadow-md shadow-success/25"
                  : isReview
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-accent text-accent-foreground shadow-md shadow-accent/25 hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/30"
              )}
            >
              {approving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Approving…</>
              ) : approved ? (
                <><CheckCircle2 className="h-4 w-4" />Approved</>
              ) : (
                <><Send className="h-4 w-4" strokeWidth={2} />Approve &amp; Send Plan</>
              )}
            </button>
          </div>
        </div>
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

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // Fetch analysis whenever the selected client changes
  const fetchAnalysis = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setApproved(false);

    try {
      const res = await fetch(`/api/checkin-analysis?clientId=${encodeURIComponent(clientId)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "An unexpected error occurred.");
      } else {
        setAnalysis(json as AnalysisResult);
      }
    } catch {
      setError("Network error — could not reach the analysis API.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when the page first mounts (uses URL ?clientId= if present)
  useEffect(() => {
    if (initialId) fetchAnalysis(initialId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id: string) => {
    setSelectedId(id);
    fetchAnalysis(id);
  };

  // POST to approve the current check-in
  const handleApprove = async () => {
    if (!analysis) return;
    setApproving(true);
    try {
      const res = await fetch("/api/checkin-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId:     analysis.latestCheckInId,
          coachSummary:  analysis.aiOutput.coachSummary,
          clientMessage: analysis.aiOutput.clientMessage,
        }),
      });
      if (res.ok) {
        setApproved(true);
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <LeftPanel
          clients={queueClients}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* Right panel: loading / error / analysis / empty */}
        {loading ? (
          <LoadingPanel name={queueClients.find((c) => c.id === selectedId)?.name ?? "client"} />
        ) : error ? (
          <ErrorPanel message={error} />
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
