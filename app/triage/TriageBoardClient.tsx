"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Clock, CircleDot } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {items.map(({ triage, dot, label }) => (
        <span key={triage} className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
          <span>
            <span className="font-semibold text-foreground">{counts[triage]}</span>{" "}
            {label}
          </span>
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

      <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            AVATAR_BG[row.triage]
          )}
        >
          {row.initials}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{row.name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                BADGE_STYLE[row.triage]
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[row.triage])} aria-hidden />
              {TRIAGE_LABEL[row.triage]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.goal}
            {row.currentPhase ? ` · ${row.currentPhase}` : ""}
          </p>
          <p className={cn("mt-1 truncate text-xs font-medium", HEADLINE_COLOR[row.triage])}>
            {row.headline}
          </p>
        </div>

        {/* Days since check-in */}
        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
          {row.daysSinceLastCheckIn !== null ? (
            <>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold tabular-nums",
                  row.daysSinceLastCheckIn > OVERDUE_DAYS ? "text-anomaly" : "text-muted-foreground"
                )}
              >
                <Clock className="h-3 w-3" aria-hidden />
                {row.daysSinceLastCheckIn}d ago
              </span>
              <span className="text-[10px] text-muted-foreground">last check-in</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CircleDot className="h-3 w-3" aria-hidden />
                Never
              </span>
              <span className="text-[10px] text-muted-foreground">no check-ins</span>
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
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", DOT[triage])} aria-hidden />
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label[triage]}
      </h2>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {count}
      </span>
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Triage Board
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                All clients sorted by urgency — people who need you most are at the top.
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
