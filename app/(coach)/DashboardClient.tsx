"use client";

import Link from "next/link";
import {
  Users, AlertTriangle, BarChart3,
  Plus, CheckCircle2, ChevronRight,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Exported types (consumed by the server component) ─────────────────────────
// NOTE: this is the data contract with app/page.tsx — its shape is unchanged by
// the reskin. Presentation below rebinds these same fields; it never invents or
// drops data.

export type AttentionClient = {
  id: string;
  name: string;
  triage: "red" | "yellow";
  headline: string;
  daysSinceLastCheckIn: number | null;
};

export type DashboardData = {
  coachName: string;
  totalClients: number;
  attentionClients: AttentionClient[];
  onTrackCount: number;
  macroCompliancePct: number | null;
  recentCheckIns: {
    checkInId: string;
    id: string; name: string; initials: string; time: string;
    status: "on_track" | "pending_review" | "action_needed";
  }[];
  checkInBars: { day: string; count: number; isToday: boolean }[];
};

// ── Internal types ────────────────────────────────────────────────────────────

type TriageUrgency = "critical" | "warning";

type TriageItem = {
  id: string;
  urgency: TriageUrgency;
  name: string;
  detail: string;
  href: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toTriageItem(ac: AttentionClient): TriageItem {
  return {
    id: ac.id,
    urgency: ac.triage === "red" ? "critical" : "warning",
    name: ac.name,
    detail: ac.headline,
    // Unchanged route — opens the client's review in the AI hub.
    href: `/ai-check-ins?clientId=${encodeURIComponent(ac.id)}`,
  };
}

// Left-bar + avatar tint per urgency. The reference only ever shows warnings
// (amber); criticals get the red treatment so the red/yellow triage split the
// engine produces stays visible rather than flattening to one colour.
const URGENCY: Record<TriageUrgency, { bar: string; avatar: string }> = {
  critical: { bar: "border-l-red",   avatar: "bg-[color-mix(in_oklab,var(--red)_18%,#14161B)] text-red" },
  warning:  { bar: "border-l-amber", avatar: "bg-[color-mix(in_oklab,var(--amber)_18%,#14161B)] text-amber" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, tone, eyebrow, label, value, cap }: {
  icon: typeof Users;
  tone: "accent" | "amber" | "green";
  eyebrow: string; label: string; value: string; cap: string;
}) {
  const tile = {
    accent: "bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-accent-lite",
    amber:  "bg-[color-mix(in_oklab,var(--amber)_15%,transparent)] text-amber",
    green:  "bg-[color-mix(in_oklab,var(--green)_15%,transparent)] text-green",
  }[tone];
  const valueColor = { accent: "text-text", amber: "text-amber", green: "text-green" }[tone];
  return (
    <div className="rounded-2xl border border-hair bg-surface p-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-5 flex items-center justify-between gap-2.5">
        <div className={cn("flex h-[38px] w-[38px] items-center justify-center rounded-[10px]", tile)}>
          <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} />
        </div>
        <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-2">{eyebrow}</span>
      </div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">{label}</p>
      <div className="flex items-baseline gap-2.5">
        <span className={cn("font-mono text-[40px] font-medium leading-none tracking-[-0.02em]", valueColor)}>{value}</span>
        <span className="text-[12.5px] text-muted-2">{cap}</span>
      </div>
    </div>
  );
}

function AttentionRow({ item }: { item: TriageItem }) {
  const u = URGENCY[item.urgency];
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3.5 rounded-xl border border-white/[0.06] border-l-[3px] bg-surface-deep px-4 py-3.5",
        "transition-[background-color,transform] hover:translate-x-0.5 hover:bg-[#151820]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
        u.bar
      )}
    >
      <div className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold", u.avatar)}>
        {initialsOf(item.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold text-text">{item.name}</p>
        <p className="truncate text-[13px] text-muted-1">{item.detail}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] px-3 py-2 text-[12.5px] font-bold text-accent-lite">
        Review<ChevronRight className="h-3 w-3" strokeWidth={2.4} />
      </span>
    </Link>
  );
}

function CheckInBarChart({ bars }: { bars: DashboardData["checkInBars"] }) {
  const maxBar = Math.max(...bars.map((b) => b.count), 1);
  const H = 72; // px height of a full-count bar; container leaves room for the label
  return (
    <div className="mt-1.5 flex h-24 items-end justify-between gap-2">
      {bars.map(({ day, count, isToday }) => {
        const h = count === 0 ? 4 : Math.max(Math.round((count / maxBar) * H), 6);
        return (
          <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              className={cn(
                "w-full rounded-t-md",
                isToday ? "bg-accent" : count === 0 ? "bg-white/[0.07]" : "bg-white/[0.16]"
              )}
              style={{ height: h }}
            />
            <span className={cn("text-[11px] font-semibold", isToday ? "text-accent-lite" : "text-muted-3")}>
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PANEL = "rounded-2xl border border-hair bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
const PANEL_TITLE = "text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C7CDD6]";

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardClient({ data }: { data: DashboardData }) {
  const { coachName, totalClients, attentionClients, onTrackCount, macroCompliancePct, recentCheckIns, checkInBars } = data;

  const triageItems         = attentionClients.map(toTriageItem);
  const redCount            = attentionClients.filter((c) => c.triage === "red").length;
  const yellowCount         = attentionClients.filter((c) => c.triage === "yellow").length;
  const needsAttentionCount = attentionClients.length;
  const weekTotal           = checkInBars.reduce((s, b) => s + b.count, 0);

  const attentionEyebrow = needsAttentionCount > 0
    ? `${redCount} CRITICAL · ${yellowCount} TO REVIEW`
    : "ALL ON TRACK";

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-9">

          {/* Greeting header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="font-display text-[27px] font-extrabold leading-none tracking-[-0.02em] text-text">
                {getGreeting()}, {coachName}.
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13.5px] text-muted-1">
                <span suppressHydrationWarning>{formatDate()}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[#3B424C]" />
                <span className="flex items-center gap-1.5 text-green">
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-green shadow-[0_0_0_3px_color-mix(in_oklab,var(--green)_22%,transparent)]" />
                  Platform live
                </span>
                {/* The "needs attention" count lives in the stat card (the number)
                    and the panel (who) — the header echo was dropped as redundant. */}
              </div>
            </div>
            <Link href="/clients/new" className={buttonClass({ size: "lg" })}>
              <Plus className="h-4 w-4" strokeWidth={2.2} />Add client
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Users}
              tone="accent"
              eyebrow="LIVE COUNT"
              label="Active clients"
              value={totalClients.toString()}
              cap="on roster"
            />
            <StatCard
              icon={AlertTriangle}
              tone={needsAttentionCount > 0 ? "amber" : "green"}
              eyebrow={attentionEyebrow}
              label="Needs attention"
              value={needsAttentionCount.toString()}
              cap="flagged by engine"
            />
            <StatCard
              icon={BarChart3}
              tone="green"
              eyebrow={macroCompliancePct !== null ? "7-DAY AVG" : "NO CHECK-INS"}
              label="Macro compliance"
              value={macroCompliancePct !== null ? `${macroCompliancePct}%` : "—"}
              cap="across roster"
            />
          </div>

          {/* Main two-column body */}
          <div className="grid items-start gap-4 lg:grid-cols-[1.65fr_1fr]">

            {/* LEFT: Requires attention */}
            <section aria-labelledby="triage-heading" className={cn(PANEL, "p-[22px]")}>
              <div className="flex items-center justify-between gap-2.5">
                <h2 id="triage-heading" className={cn(PANEL_TITLE, "flex items-center gap-2.5")}>
                  <AlertTriangle className="h-4 w-4 text-amber" strokeWidth={2} />
                  Requires attention
                </h2>
                {needsAttentionCount > 0 && (
                  <span className="rounded-md bg-[color-mix(in_oklab,var(--amber)_16%,transparent)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber">
                    {needsAttentionCount}
                  </span>
                )}
              </div>
              <p className="mb-4 mt-1 text-[12.5px] text-muted-2">
                Sorted by urgency — tap a client to open the review.
              </p>

              {triageItems.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {triageItems.map((item) => <AttentionRow key={item.id} item={item} />)}
                </div>
              )}

              <div className={cn(
                "flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--green)_16%,transparent)] bg-[color-mix(in_oklab,var(--green)_7%,var(--surface-deep))] px-4 py-3.5",
                triageItems.length > 0 ? "mt-2.5" : ""
              )}>
                <CheckCircle2 className="h-[17px] w-[17px] shrink-0 text-green" strokeWidth={2} />
                <span className="text-[13.5px] text-muted-1">
                  <b className="font-bold text-text">{onTrackCount} client{onTrackCount !== 1 ? "s" : ""}</b> fully on track with no flags.
                </span>
              </div>

              <Link
                href="/triage"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-hair-2 py-2.5 text-[13px] font-semibold text-nav transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                View full Triage Board<ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </Link>
            </section>

            {/* RIGHT: Recent check-ins + weekly activity */}
            <aside className="flex flex-col gap-4">

              <div className={cn(PANEL, "p-5")}>
                <div className="mb-4 flex items-center justify-between gap-2.5">
                  <h3 className={PANEL_TITLE}>Recent check-ins</h3>
                  <Link href="/ai-check-ins" className="text-[12px] font-semibold text-accent-lite hover:underline">
                    View all
                  </Link>
                </div>
                <div className="flex flex-col gap-0.5">
                  {recentCheckIns.length === 0 ? (
                    <p className="text-[13px] text-muted-2">No check-ins yet.</p>
                  ) : (
                    recentCheckIns.map((c) => {
                      // Route unchanged: on-track opens the client page, anything
                      // needing review opens the AI hub.
                      const href = c.status === "on_track"
                        ? `/clients/${c.id}`
                        : `/ai-check-ins?clientId=${encodeURIComponent(c.id)}`;
                      return (
                        <Link
                          key={c.checkInId}
                          href={href}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_oklab,var(--accent)_14%,#14161B)] text-[12px] font-bold text-accent-lite">
                            {c.initials}
                          </div>
                          <span className="flex-1 truncate text-[13.5px] font-semibold text-text">{c.name}</span>
                          <span className="font-mono text-[12px] font-medium text-muted-2">
                            {new Date(c.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={cn(PANEL, "p-5")}>
                <div className="mb-4 flex items-center justify-between gap-2.5">
                  <h3 className={PANEL_TITLE}>This week</h3>
                  <span className="font-mono text-[12px] font-medium text-muted-3">
                    {weekTotal} check-in{weekTotal !== 1 ? "s" : ""}
                  </span>
                </div>
                <CheckInBarChart bars={checkInBars} />
              </div>

            </aside>
          </div>
        </div>
  );
}
