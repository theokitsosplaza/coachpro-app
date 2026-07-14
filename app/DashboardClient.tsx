"use client";

import Link from "next/link";
import {
  Users, AlertTriangle, BarChart3,
  TrendingUp, TrendingDown, Minus,
  UserPlus, ArrowRight,
  CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Exported types (consumed by the server component) ─────────────────────────

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
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  action: string;
  href?: string;
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

function toTriageItem(ac: AttentionClient): TriageItem {
  return {
    id: ac.id,
    urgency: ac.triage === "red" ? "critical" : "warning",
    icon: AlertTriangle,
    title: ac.name,
    detail: ac.headline,
    action: "Review",
    href: `/ai-check-ins?clientId=${encodeURIComponent(ac.id)}`,
  };
}

const STATUS_CONFIG = {
  on_track:       { label: "On Track",     dot: "bg-success", text: "text-success" },
  pending_review: { label: "Pending",       dot: "bg-warning", text: "text-warning" },
  action_needed:  { label: "Action Needed", dot: "bg-anomaly", text: "text-anomaly" },
};

const URGENCY_BORDER: Record<TriageUrgency, string> = {
  critical: "border-l-anomaly",
  warning:  "border-l-warning",
};

const URGENCY_ICON_COLOR: Record<TriageUrgency, string> = {
  critical: "text-anomaly",
  warning:  "text-warning",
};

const URGENCY_ACTION: Record<TriageUrgency, string> = {
  critical: "border-anomaly/30 text-anomaly hover:bg-anomaly-muted/50",
  warning:  "border-warning/30 text-warning hover:bg-warning-muted/50",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, delta, deltaDir, sub }: {
  icon: typeof Users; label: string; value: string;
  delta: string; deltaDir: "up" | "down" | "flat"; sub?: string;
}) {
  const DeltaIcon = deltaDir === "up" ? TrendingUp : deltaDir === "down" ? TrendingDown : Minus;
  const deltaColor = deltaDir === "up" ? "text-success" : deltaDir === "down" ? "text-anomaly" : "text-muted-foreground";
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-semibold", deltaColor)}>
          <DeltaIcon className="h-3.5 w-3.5" />{delta}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TriageCard({ item }: { item: TriageItem }) {
  const Icon = item.icon;
  const content = (
    <div className={cn(
      "group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all",
      "border-l-4 hover:border-border/80 hover:shadow-md",
      URGENCY_BORDER[item.urgency]
    )}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        <Icon className={cn("h-5 w-5", URGENCY_ICON_COLOR[item.urgency])} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <span className={cn(
        "inline-flex shrink-0 items-center gap-1 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
        URGENCY_ACTION[item.urgency]
      )}>
        {item.action}<ChevronRight className="h-3 w-3" />
      </span>
    </div>
  );
  return item.href
    ? <Link href={item.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">{content}</Link>
    : <div>{content}</div>;
}

function CheckInBarChart({ bars }: { bars: DashboardData["checkInBars"] }) {
  const maxBar = Math.max(...bars.map((b) => b.count), 1);
  const barH = 64;
  return (
    <div className="flex items-end gap-1.5" style={{ height: barH + 20 }}>
      {bars.map(({ day, count, isToday }) => {
        const h = Math.max(Math.round((count / maxBar) * barH), 4);
        return (
          <div key={day} className="group flex flex-1 flex-col items-center gap-1">
            <span className="hidden text-[9px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block">
              {count}
            </span>
            <div
              className={cn("w-full rounded-sm transition-all", isToday ? "bg-accent" : "bg-muted-foreground/25 group-hover:bg-accent/50")}
              style={{ height: h }}
            />
            <span className={cn("text-[10px] font-medium", isToday ? "font-bold text-accent" : "text-muted-foreground")}>
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardClient({ data }: { data: DashboardData }) {
  const { coachName, totalClients, attentionClients, onTrackCount, macroCompliancePct, recentCheckIns, checkInBars } = data;

  const triageItems       = attentionClients.map(toTriageItem);
  const redCount          = attentionClients.filter((c) => c.triage === "red").length;
  const yellowCount       = attentionClients.filter((c) => c.triage === "yellow").length;
  const needsAttentionCount = attentionClients.length;

  const todayCount = checkInBars.find((b) => b.isToday)?.count ?? 0;
  const weekTotal  = checkInBars.reduce((s, b) => s + b.count, 0);

  const attentionDelta    = needsAttentionCount === 0 ? "All on track" : `${redCount} critical · ${yellowCount} to review`;
  const attentionDeltaDir = (needsAttentionCount === 0 ? "up" : "flat") as "up" | "flat";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar coachName={coachName} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

          {/* Greeting header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-foreground">
                {getGreeting()}, {coachName}.
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span suppressHydrationWarning>{formatDate()}</span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  Platform live
                </span>
                <span className="text-border">·</span>
                <span suppressHydrationWarning>
                  {needsAttentionCount > 0
                    ? `${needsAttentionCount} client${needsAttentionCount > 1 ? "s" : ""} need attention`
                    : "All clients on track"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <Link href="/clients/new" className={buttonClass()}>
                <UserPlus className="h-4 w-4" strokeWidth={2} />Add Client
              </Link>
            </div>
          </div>

          {/* Metric cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <MetricCard
              icon={Users}
              label="Active clients"
              value={totalClients.toString()}
              delta="Live count"
              deltaDir="flat"
              sub={`${totalClients} on roster`}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Needs attention"
              value={needsAttentionCount.toString()}
              delta={attentionDelta}
              deltaDir={attentionDeltaDir}
              sub="red + yellow · from engine"
            />
            <MetricCard
              icon={BarChart3}
              label="Macro compliance"
              value={macroCompliancePct !== null ? `${macroCompliancePct}%` : "—"}
              delta={macroCompliancePct !== null ? "Avg calorie adherence" : "No check-ins this week"}
              deltaDir="flat"
              sub="7-day avg · clients with targets"
            />
          </div>

          {/* Main two-column body */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* LEFT: Attention triage */}
            <section aria-labelledby="triage-heading">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 id="triage-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={2} />
                    Requires Attention
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sorted by urgency — tap an item to act
                  </p>
                </div>
                {needsAttentionCount > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-[11px] font-bold text-warning">
                    {needsAttentionCount}
                  </span>
                )}
              </div>

              {triageItems.length > 0 && (
                <div className="space-y-3">
                  {triageItems.map((item) => <TriageCard key={item.id} item={item} />)}
                </div>
              )}

              <div className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground",
                triageItems.length > 0 ? "mt-4" : "mt-0"
              )}>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {onTrackCount} client{onTrackCount !== 1 ? "s" : ""} fully on track with no flags
              </div>

              <div className="mt-2 flex justify-end">
                <Link href="/triage" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  View full Triage Board<ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </section>

            {/* RIGHT: Check-in pulse + recent */}
            <aside className="flex flex-col gap-5">

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      Check-in Pulse
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Submissions this week</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{todayCount}</p>
                    <p className="text-[10px] text-muted-foreground">today · {weekTotal} this week</p>
                  </div>
                </div>
                <CheckInBarChart bars={checkInBars} />
              </div>

              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-3.5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Clock className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
                    Recent Check-ins
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {recentCheckIns.length === 0
                    ? <p className="px-5 py-4 text-xs text-muted-foreground">No check-ins yet.</p>
                    : recentCheckIns.map((c) => {
                        const s = STATUS_CONFIG[c.status];
                        const href = c.status === "on_track"
                          ? `/clients/${c.id}`
                          : `/ai-check-ins?clientId=${encodeURIComponent(c.id)}`;
                        return (
                          <Link
                            key={c.checkInId}
                            href={href}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                              {c.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(c.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className={cn("flex items-center gap-1 text-[10px] font-semibold", s.text)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />{s.label}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                  }
                </div>
                <div className="border-t border-border px-5 py-3">
                  <Link href="/ai-check-ins" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                    View all pending in AI Hub<ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
