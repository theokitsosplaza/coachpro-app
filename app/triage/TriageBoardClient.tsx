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
// The reference paints every "review" row amber and every "on track" row green,
// but the engine derives a real red/amber/green/grey per client. We keep that
// real urgency: a critical stays red, it is never flattened to amber. Status
// tints follow page-1's convention — color-mix() of the token var so a per-coach
// accent/brand never bleeds into a status colour.

// Left urgency bar (3px) — mirrors the design's `border-left:3px solid <status>`.
const BORDER_L: Record<Triage, string> = {
  red:    "border-l-red",
  yellow: "border-l-amber",
  green:  "border-l-green",
  grey:   "border-l-muted-3",
};

// Solid status dot (summary chips, badges, section headers).
const DOT: Record<Triage, string> = {
  red:    "bg-red",
  yellow: "bg-amber",
  green:  "bg-green",
  grey:   "bg-muted-3",
};

// Avatar tile — status tinted onto the card surface, like the reference.
const AVATAR_BG: Record<Triage, string> = {
  red:    "bg-[color-mix(in_oklab,var(--red)_20%,#14161B)] text-red",
  yellow: "bg-[color-mix(in_oklab,var(--amber)_20%,#14161B)] text-amber",
  green:  "bg-[color-mix(in_oklab,var(--green)_20%,#14161B)] text-green",
  grey:   "bg-[#1B1E25] text-nav",
};

const TRIAGE_LABEL: Record<Triage, string> = {
  red:    "Act Now",
  yellow: "Review",
  green:  "On Track",
  grey:   "No Data",
};

// Row status badge (soft fill + hairline border).
const BADGE_STYLE: Record<Triage, string> = {
  red:    "border-[color-mix(in_oklab,var(--red)_28%,transparent)] bg-[color-mix(in_oklab,var(--red)_14%,transparent)] text-red",
  yellow: "border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_14%,transparent)] text-amber",
  green:  "border-[color-mix(in_oklab,var(--green)_28%,transparent)] bg-[color-mix(in_oklab,var(--green)_14%,transparent)] text-green",
  grey:   "border-hair-2 bg-white/[0.04] text-muted-1",
};

// Section-header count pill.
const PILL_STYLE: Record<Triage, string> = {
  red:    "bg-[color-mix(in_oklab,var(--red)_16%,transparent)] text-red",
  yellow: "bg-[color-mix(in_oklab,var(--amber)_16%,transparent)] text-amber",
  green:  "bg-[color-mix(in_oklab,var(--green)_16%,transparent)] text-green",
  grey:   "bg-white/[0.06] text-muted-2",
};

// Page-header summary chip.
const CHIP_STYLE: Record<Triage, string> = {
  red:    "border-[color-mix(in_oklab,var(--red)_24%,transparent)] bg-[color-mix(in_oklab,var(--red)_12%,transparent)] text-red",
  yellow: "border-[color-mix(in_oklab,var(--amber)_24%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-amber",
  green:  "border-[color-mix(in_oklab,var(--green)_24%,transparent)] bg-[color-mix(in_oklab,var(--green)_12%,transparent)] text-green",
  grey:   "border-hair-2 bg-white/[0.04] text-muted-1",
};

const SECTION_LABEL: Record<Triage, string> = {
  red:    "Act Now",
  yellow: "Review This Week",
  green:  "On Track",
  grey:   "No Data",
};

// ── Summary chips ─────────────────────────────────────────────────────────────

function SummaryBar({ rows }: { rows: TriageClientRow[] }) {
  const counts = rows.reduce(
    (acc, r) => { acc[r.triage]++; return acc; },
    { red: 0, yellow: 0, green: 0, grey: 0 } as Record<Triage, number>
  );

  const items = [
    { triage: "red"    as Triage, label: "act now" },
    { triage: "yellow" as Triage, label: "to review" },
    { triage: "green"  as Triage, label: "on track" },
    { triage: "grey"   as Triage, label: "no data" },
  ].filter(({ triage }) => counts[triage] > 0);

  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map(({ triage, label }) => (
        <span
          key={triage}
          className={cn(
            "inline-flex items-center gap-[7px] rounded-[10px] border px-[13px] py-2 text-[12.5px] font-bold whitespace-nowrap",
            CHIP_STYLE[triage]
          )}
        >
          <span className={cn("h-[7px] w-[7px] rounded-full", DOT[triage])} aria-hidden />
          <span className="font-mono tabular-nums">{counts[triage]}</span> {label}
        </span>
      ))}
    </div>
  );
}

// ── Client row ────────────────────────────────────────────────────────────────

function ClientCard({
  row,
  onClick,
}: {
  row: TriageClientRow;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[14px] border border-hair border-l-[3px] bg-surface px-5 py-[18px] text-left",
        "transition-[background-color,transform] hover:translate-x-[3px] hover:bg-[#171A20]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
        BORDER_L[row.triage]
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-[15px] font-bold",
          AVATAR_BG[row.triage]
        )}
      >
        {row.initials}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[16px] font-bold text-text">{row.name}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[10.5px] font-bold whitespace-nowrap",
              BADGE_STYLE[row.triage]
            )}
          >
            <span className={cn("h-[5px] w-[5px] rounded-full", DOT[row.triage])} aria-hidden />
            {TRIAGE_LABEL[row.triage]}
          </span>
        </div>
        <p className="mb-1.5 truncate text-[12.5px] text-muted-1">
          {row.goal}
          {row.currentPhase ? ` · ${row.currentPhase}` : ""}
        </p>
        <p className="truncate text-[13.5px] text-[#C3CAD4]">{row.headline}</p>
      </div>

      {/* Days since check-in */}
      <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
        {row.daysSinceLastCheckIn !== null ? (
          <>
            <span
              className={cn(
                "font-mono text-[20px] font-semibold leading-none tabular-nums",
                row.daysSinceLastCheckIn > OVERDUE_DAYS ? "text-red" : "text-text"
              )}
            >
              {row.daysSinceLastCheckIn}<span className="text-[12px] font-medium text-muted-2">d</span>
            </span>
            <span className="text-[11px] text-muted-2">last check-in</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 text-[13px] text-muted-2">
              <CircleDot className="h-3 w-3" aria-hidden />
              Never
            </span>
            <span className="text-[11px] text-muted-2">no check-ins</span>
          </>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight
        className="h-[18px] w-[18px] shrink-0 text-muted-3 transition-colors group-hover:text-muted-1"
        strokeWidth={2.2}
        aria-hidden
      />
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-hair bg-surface py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <AlertTriangle className="h-8 w-8 text-muted-3" />
      <p className="text-sm text-muted-1">
        No clients yet. Add clients to see their triage status here.
      </p>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionLabel({ triage, count }: { triage: Triage; count: number }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className={cn("h-2 w-2 rounded-full", DOT[triage])} aria-hidden />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C7CDD6]">
        {SECTION_LABEL[triage]}
      </h2>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
          PILL_STYLE[triage]
        )}
      >
        {count}
      </span>
      <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
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
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1080px] px-6 py-8 md:px-10 md:py-9">

          {/* Page header */}
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-display text-[27px] font-extrabold leading-none tracking-[-0.02em] text-text">
                Triage Board
              </h1>
              <p className="mt-2 text-[13.5px] text-muted-1">
                All clients, sorted by who needs you most this week.
              </p>
            </div>
            <SummaryBar rows={rows} />
          </div>

          {/* Client list, grouped by triage colour */}
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              {groups.map((triage) => {
                const group = byTriage[triage];
                if (group.length === 0) return null;
                return (
                  <section key={triage} aria-label={SECTION_LABEL[triage]}>
                    <SectionLabel triage={triage} count={group.length} />
                    <div className="space-y-3">
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
