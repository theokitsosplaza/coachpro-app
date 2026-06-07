"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Brain,
  Video,
  AlertTriangle,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = "training" | "checkin" | "business";
type ViewMode = "month" | "week" | "day";

interface CalEvent {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  /** Decimal hours in 24 h, e.g. 9.5 = 09:30 */
  startHour: number;
  durationHours: number;
  type: EventType;
  title: string;
  subtitle?: string;
}

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID_START = 7; // 7 AM
const GRID_END = 20; // 8 PM
const HOUR_PX = 76; // pixels per hour
const TOTAL_HOURS = GRID_END - GRID_START;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX;

// Week of Thu Jun 4, 2026 → Mon Jun 1 … Sun Jun 7
const TODAY_IDX = 3; // Thursday

const DAYS = [
  { short: "Mon", date: 1 },
  { short: "Tue", date: 2 },
  { short: "Wed", date: 3 },
  { short: "Thu", date: 4 },
  { short: "Fri", date: 5 },
  { short: "Sat", date: 6 },
  { short: "Sun", date: 7 },
] as const;

// ── Event styling config ──────────────────────────────────────────────────────

const EVENT_CFG: Record<
  EventType,
  {
    borderLeft: string;
    bg: string;
    titleColor: string;
    accentColor: string;
    Icon: typeof Brain;
  }
> = {
  /** Deep-work / focus blocks — blue */
  training: {
    borderLeft: "border-l-accent",
    bg: "bg-accent/10 hover:bg-accent/[0.16] border-accent/20",
    titleColor: "text-foreground",
    accentColor: "text-accent",
    Icon: Brain,
  },
  /** System deadlines & billing alerts — orange */
  checkin: {
    borderLeft: "border-l-warning",
    bg: "bg-warning/10 hover:bg-warning/[0.16] border-warning/20",
    titleColor: "text-foreground",
    accentColor: "text-warning",
    Icon: AlertTriangle,
  },
  /** Video calls & client meetings — green */
  business: {
    borderLeft: "border-l-success",
    bg: "bg-success/10 hover:bg-success/[0.16] border-success/20",
    titleColor: "text-foreground",
    accentColor: "text-success",
    Icon: Video,
  },
};

// ── Mock events ───────────────────────────────────────────────────────────────

const EVENTS: CalEvent[] = [
  // ── Monday Jun 1 ────────────────────────────────────────────────────────────
  // 3-hr deep work block to process the week's incoming check-ins
  { id: "e1", day: 0, startHour: 8, durationHours: 3, type: "training", title: "Check-in Processing & AI Review", subtitle: "All client analyses · 48 pending" },
  // afternoon: a client who needs a manual conversation
  { id: "e2", day: 0, startHour: 15, durationHours: 0.75, type: "business", title: "Monthly Strategy Sync", subtitle: "James Mitchell" },

  // ── Tuesday Jun 2 ───────────────────────────────────────────────────────────
  // onboarding a brand-new client
  { id: "e3", day: 1, startHour: 10, durationHours: 1, type: "business", title: "Client Onboarding Call", subtitle: "Priya Sharma" },
  // system deadline: check-in window closes for the Tuesday cohort
  { id: "e4", day: 1, startHour: 17, durationHours: 0.5, type: "checkin", title: "Check-in Window Closes", subtitle: "Tue / Wed cohort" },

  // ── Wednesday Jun 3 ─────────────────────────────────────────────────────────
  // 2-hr block to update programs and write new macrocycles
  { id: "e5", day: 2, startHour: 9, durationHours: 2, type: "training", title: "Program Design & Updates", subtitle: "Macro cycle refresh · 6 clients" },
  // quarterly business review with a mentor / partner
  { id: "e6", day: 2, startHour: 14, durationHours: 1, type: "business", title: "Q3 Business Review", subtitle: "Revenue, retention & growth" },

  // ── Thursday Jun 4 — today ──────────────────────────────────────────────────
  // morning deep-work: building next week's programme templates
  { id: "e7", day: 3, startHour: 8, durationHours: 2, type: "training", title: "Program Design & Updates", subtitle: "Next microcycle prep" },
  // mid-morning biz dev block: nurture leads and follow up on enquiries
  { id: "e8", day: 3, startHour: 11, durationHours: 1, type: "training", title: "Lead Follow-ups & Biz Dev", subtitle: "Enquiries, referrals & outreach" },
  // progress call with a key client
  { id: "e9", day: 3, startHour: 13, durationHours: 1, type: "business", title: "Progress Review Call", subtitle: "Marcus Chen · 12-wk milestone" },

  // ── Friday Jun 5 ────────────────────────────────────────────────────────────
  // weekly retro + plan next week's content
  { id: "e10", day: 4, startHour: 9, durationHours: 1.5, type: "training", title: "Weekly Retro & Content Planning", subtitle: "Newsletters, posts & updates" },
  // check-in deadline for the Friday cohort
  { id: "e11", day: 4, startHour: 18, durationHours: 0.5, type: "checkin", title: "Check-in Window Closes", subtitle: "Fri cohort · 14 clients" },

  // ── Saturday Jun 6 ──────────────────────────────────────────────────────────
  // weekend check-in submissions pile up; awareness block for Sunday processing
  { id: "e12", day: 5, startHour: 9, durationHours: 0.5, type: "checkin", title: "Weekend Check-ins Open", subtitle: "Sun cohort window active" },

  // ── Sunday Jun 7 ────────────────────────────────────────────────────────────
  // hard deadline for Sunday cohort
  { id: "e13", day: 6, startHour: 20 - 1, durationHours: 1, type: "checkin", title: "Sunday Check-ins Due", subtitle: "Final submission deadline" },
  // light planning block to prep the coming week
  { id: "e14", day: 6, startHour: 15, durationHours: 1.5, type: "training", title: "Next-Week Prep", subtitle: "Triage queue · set AI context" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHour(h: number): string {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const period = hr < 12 ? "AM" : "PM";
  const disp = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return min === 0
    ? `${disp} ${period}`
    : `${disp}:${String(min).padStart(2, "0")} ${period}`;
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalEvent }) {
  const cfg = EVENT_CFG[event.type];
  const Icon = cfg.Icon;
  const topPx = (event.startHour - GRID_START) * HOUR_PX;
  const heightPx = Math.max(event.durationHours * HOUR_PX - 4, 26);
  const compact = heightPx < 50;

  return (
    <div
      className={cn(
        "absolute left-1 right-1 cursor-pointer select-none overflow-hidden rounded-lg border border-l-[3px] px-2.5 transition-all",
        cfg.borderLeft,
        cfg.bg,
        compact ? "flex items-center gap-1.5 py-0" : "py-1.5"
      )}
      style={{ top: topPx + 2, height: heightPx }}
      title={`${event.title}${event.subtitle ? ` — ${event.subtitle}` : ""} · ${fmtHour(event.startHour)}`}
    >
      {compact ? (
        <>
          <Icon className={cn("h-2.5 w-2.5 shrink-0", cfg.accentColor)} strokeWidth={2.5} />
          <span className={cn("truncate text-[10px] font-bold leading-none", cfg.titleColor)}>
            {event.title}
            {event.subtitle && (
              <span className={cn("ml-1 font-medium", cfg.accentColor)}>— {event.subtitle}</span>
            )}
          </span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <Icon className={cn("h-3 w-3 shrink-0", cfg.accentColor)} strokeWidth={2.5} />
            <span className={cn("truncate text-[11px] font-bold leading-tight", cfg.titleColor)}>
              {event.title}
            </span>
          </div>
          {event.subtitle && (
            <p className={cn("mt-0.5 truncate text-[10px] font-semibold leading-tight", cfg.accentColor)}>
              {event.subtitle}
            </p>
          )}
          <p className="mt-1 text-[9px] font-medium tabular-nums text-muted-foreground/55">
            {fmtHour(event.startHour)}
            {event.durationHours >= 0.5 && ` — ${fmtHour(event.startHour + event.durationHours)}`}
          </p>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => GRID_START + i);

  const LEGEND = [
    { dot: "bg-accent", label: "Deep Work Block" },
    { dot: "bg-warning", label: "System Deadline" },
    { dot: "bg-success", label: "Video / Client Call" },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          {/* Left: title + date range */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-accent" strokeWidth={2} />
            <h1 className="text-base font-bold text-foreground">Coaching Calendar</h1>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Jun 1 – 7, 2026
            </span>
          </div>

          {/* Right: legend + nav + toggle + CTA */}
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden items-center gap-4 border-r border-border pr-4 lg:flex">
              {LEGEND.map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", dot)} />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              {(["month", "week", "day"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all",
                    view === v
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Schedule Event CTA */}
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground",
                "shadow-sm shadow-accent/20 transition-colors hover:bg-accent/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Schedule Event
            </button>
          </div>
        </header>

        {/* ── Calendar body ─────────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* Day header row — pinned above the scrollable grid */}
          <div
            className="grid shrink-0 border-b border-border bg-card"
            style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
          >
            {/* Corner spacer */}
            <div className="border-r border-border" />
            {DAYS.map(({ short, date }, i) => {
              const isToday = i === TODAY_IDX;
              return (
                <div
                  key={short}
                  className={cn(
                    "flex flex-col items-center gap-1 border-r border-border py-3",
                    i === 6 && "border-r-0",
                    isToday && "bg-accent/[0.06]"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      isToday ? "text-accent" : "text-muted-foreground"
                    )}
                  >
                    {short}
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                      isToday
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    )}
                  >
                    {date}
                  </span>
                  {/* Event-count dots */}
                  <div className="flex h-2 items-center gap-0.5">
                    {EVENTS.filter((e) => e.day === i).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          e.type === "training" ? "bg-accent" :
                          e.type === "checkin" ? "bg-warning" : "bg-success"
                        )}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: "56px repeat(7, 1fr)",
                height: GRID_HEIGHT,
                minHeight: GRID_HEIGHT,
              }}
            >
              {/* Time gutter */}
              <div className="relative border-r border-border bg-card/60">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 flex w-full items-start justify-end pr-2.5"
                    style={{ top: (h - GRID_START) * HOUR_PX - 7 }}
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/50">
                      {h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map(({ short }, dayIdx) => {
                const isToday = dayIdx === TODAY_IDX;
                const dayEvents = EVENTS.filter((e) => e.day === dayIdx);

                return (
                  <div
                    key={short}
                    className={cn(
                      "relative border-r border-border",
                      dayIdx === 6 && "border-r-0",
                      isToday && "bg-accent/[0.025]"
                    )}
                  >
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="pointer-events-none absolute left-0 right-0 border-t border-border/50"
                        style={{ top: (h - GRID_START) * HOUR_PX }}
                      />
                    ))}
                    {/* Half-hour dashed lines */}
                    {hours.map((h) => (
                      <div
                        key={`${h}h`}
                        className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-border/25"
                        style={{ top: (h - GRID_START) * HOUR_PX + HOUR_PX / 2 }}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
