"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, CircleDot } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import type { Triage } from "@/lib/coach-engine";
import { OVERDUE_DAYS } from "@/lib/triage-constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriageClientRow = {
  id: string;
  name: string;
  initials: string;
  goal: string;
  currentPhase: string;
  triage: Triage;
  daysSinceLastCheckIn: number | null; // null = never checked in
  headline: string;
};

// ── Triage colour maps ────────────────────────────────────────────────────────

const STRIPE: Record<Triage, string> = {
  red:    "bg-anomaly",
  yellow: "bg-warning",
  green:  "bg-success",
  grey:   "bg-muted-foreground/40",
};

const DOT: Record<Triage, string> = {
  red:    "bg-anomaly",
  yellow: "bg-warning",
  green:  "bg-success",
  grey:   "bg-muted-foreground/40",
};

const AVATAR_BG: Record<Triage, string> = {
  red:    "bg-anomaly/10 text-anomaly",
  yellow: "bg-warning/10 text-warning",
  green:  "bg-success/10 text-success",
  grey:   "bg-muted text-muted-foreground",
};

const HEADLINE_COLOR: Record<Triage, string> = {
  red:    "text-anomaly",
  yellow: "text-warning",
  green:  "text-muted-foreground",
  grey:   "text-muted-foreground",
};

const TRIAGE_LABEL: Record<Triage, string> = {
  red:    "Act Now",
  yellow: "Review",
  green:  "On Track",
  grey:   "No Data",
};

const BADGE_STYLE: Record<Triage, string> = {
  red:    "border-anomaly/30 bg-anomaly-muted text-anomaly",
  yellow: "border-warning/30 bg-warning-muted text-warning",
  green:  "border-success/25 bg-success-muted text-success",
  grey:   "border-border bg-muted text-muted-foreground",
};

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ rows }: { rows: TriageClientRow[] }) {
  const counts = rows.reduce(
    (acc, r) => { acc[r.triage]++; return acc; },
    { red: 0, yellow: 0, green: 0, grey: 0 } as Record<Triage, number>
  );

  const items = [
    { triage: "red"    as Triage, dot: DOT.red,    label: "act now" },
    { triage: "yellow" as Triage, dot: DOT.yellow, label: "to review" },
    { triage: "green"  as Triage, dot: DOT.green,  label: "on track" },
    { triage: "grey"   as Triage, dot: DOT.grey,   label: "no data" },
  ].filter(({ triage }) => counts[triage] > 0);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-border bg-surface-1 px-4 py-2.5">
      {items.map(({ triage, dot, label }, i) => (
        <span key={triage} className="inline-flex items-center gap-2.5">
          {i > 0 && <span className="h-4 w-px bg-border" aria-hidden />}
          <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {counts[triage]}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────────

function ClientCard({
  row,
  onClick,
}: {
  row: TriageClientRow;
  onClick: () => void;
}) {
  const isRed = row.triage === "red";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left",
        "flex items-stretch overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isRed && "border-anomaly/25 bg-anomaly-muted/20 hover:bg-anomaly-muted/30"
      )}
    >
      {/* Coloured left stripe */}
      <div className={cn("w-1 shrink-0", STRIPE[row.triage])} aria-hidden />

      <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
            AVATAR_BG[row.triage]
          )}
        >
          {row.initials}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.005em] text-foreground">{row.name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                BADGE_STYLE[row.triage]
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[row.triage])} aria-hidden />
              {TRIAGE_LABEL[row.triage]}
            </span>
          </div>
          <p className="mt-1 truncate text-[13px] text-muted-foreground">
            {row.goal}
            {row.currentPhase ? ` · ${row.currentPhase}` : ""}
          </p>
          <p className={cn("mt-1 truncate text-[13px] font-medium", HEADLINE_COLOR[row.triage])}>
            {row.headline}
          </p>
        </div>

        {/* Days since check-in */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          {row.daysSinceLastCheckIn !== null ? (
            <>
              <span
                className={cn(
                  "flex items-baseline gap-1 font-mono text-[15px] font-semibold tabular-nums leading-none",
                  row.daysSinceLastCheckIn > OVERDUE_DAYS ? "text-anomaly" : "text-foreground"
                )}
              >
                {row.daysSinceLastCheckIn}<span className="text-[11px] font-medium text-muted-foreground">d</span>
              </span>
              <span className="text-[11px] text-muted-foreground">last check-in</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <CircleDot className="h-3 w-3" aria-hidden />
                Never
              </span>
              <span className="text-[11px] text-muted-foreground">no check-ins</span>
            </>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
          aria-hidden
        />
      </div>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        No clients yet. Add clients to see their triage status here.
      </p>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionLabel({ triage, count }: { triage: Triage; count: number }) {
  const label: Record<Triage, string> = {
    red:    "Act Now",
    yellow: "Review This Week",
    green:  "On Track",
    grey:   "No Data",
  };
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("h-2 w-2 rounded-full", DOT[triage])} aria-hidden />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
        {label[triage]}
      </h2>
      <span className="min-w-[1.25rem] rounded-full bg-surface-2 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
      <span className="h-px flex-1 bg-border/70" aria-hidden />
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export function TriageBoardClient({ rows }: { rows: TriageClientRow[] }) {
  const router = useRouter();

  const groups: Triage[] = ["red", "yellow", "green", "grey"];

  const byTriage = groups.reduce(
    (acc, t) => {
      acc[t] = rows.filter((r) => r.triage === t);
      return acc;
    },
    {} as Record<Triage, TriageClientRow[]>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">

          {/* Page header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-foreground">
                Triage Board
              </h1>
              <p className="mt-2.5 text-sm text-muted-foreground">
                All clients, sorted by who needs you most this week.
              </p>
            </div>
            <SummaryBar rows={rows} />
          </div>

          {/* Client list, grouped by triage colour */}
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {groups.map((triage) => {
                const group = byTriage[triage];
                if (group.length === 0) return null;
                return (
                  <section key={triage} aria-label={TRIAGE_LABEL[triage]}>
                    <div className="mb-2">
                      <SectionLabel triage={triage} count={group.length} />
                    </div>
                    <div className="space-y-2">
                      {group.map((row) => (
                        <ClientCard
                          key={row.id}
                          row={row}
                          onClick={() =>
                            router.push(`/ai-check-ins?clientId=${encodeURIComponent(row.id)}`)
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
