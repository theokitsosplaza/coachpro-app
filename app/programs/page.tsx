"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Users,
  Calculator,
  ChevronRight,
  Dumbbell,
  Layers,
  RotateCcw,
  CalendarDays,
  Target,
  Clock,
  Pencil,
  Zap,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

// ── Types & mock data ─────────────────────────────────────────────────────────

type ProgramType = "training_nutrition" | "training" | "nutrition";

type Program = {
  id: string;
  name: string;
  type: ProgramType;
  goal: string;
  assignedCount: number;
  createdAt: string;
  durationWeeks: number;
  frequency: number;
  split: string;
  macros: { protein: number; carbs: number; fats: number };
  days: WeekDay[];
};

type WorkoutDay = {
  kind: "workout";
  name: string;
  exerciseCount: number;
  sets: number;
  muscles: string;
};

type RestDay = { kind: "rest" };

type WeekDay = {
  label: string;
  short: string;
  session: WorkoutDay | RestDay;
};

const PROGRAMS: Program[] = [
  {
    id: "hypertrophy-cut",
    name: "4-Day Hypertrophy Cut",
    type: "training_nutrition",
    goal: "Aesthetic V-Shape",
    assignedCount: 12,
    createdAt: "12 Feb 2026",
    durationWeeks: 12,
    frequency: 4,
    split: "Upper / Lower",
    macros: { protein: 160, carbs: 250, fats: 70 },
    days: [
      { label: "Monday", short: "Mon", session: { kind: "workout", name: "Upper A", exerciseCount: 6, sets: 18, muscles: "Chest · Back · Shoulders · Triceps" } },
      { label: "Tuesday", short: "Tue", session: { kind: "workout", name: "Lower A", exerciseCount: 5, sets: 15, muscles: "Quads · Hamstrings · Glutes · Calves" } },
      { label: "Wednesday", short: "Wed", session: { kind: "rest" } },
      { label: "Thursday", short: "Thu", session: { kind: "workout", name: "Upper B", exerciseCount: 6, sets: 18, muscles: "Shoulders · Back · Chest · Arms" } },
      { label: "Friday", short: "Fri", session: { kind: "workout", name: "Lower B", exerciseCount: 5, sets: 16, muscles: "Hamstrings · Quads · Glutes" } },
      { label: "Saturday", short: "Sat", session: { kind: "rest" } },
      { label: "Sunday", short: "Sun", session: { kind: "rest" } },
    ],
  },
  {
    id: "ppl-aesthetic",
    name: "5-Day PPL Aesthetic",
    type: "training",
    goal: "Muscle Gain",
    assignedCount: 8,
    createdAt: "28 Jan 2026",
    durationWeeks: 10,
    frequency: 5,
    split: "Push / Pull / Legs",
    macros: { protein: 180, carbs: 300, fats: 75 },
    days: [],
  },
  {
    id: "fullbody-recomp",
    name: "3-Day Full Body Recomp",
    type: "training_nutrition",
    goal: "Recomposition",
    assignedCount: 6,
    createdAt: "5 Mar 2026",
    durationWeeks: 16,
    frequency: 3,
    split: "Full Body",
    macros: { protein: 150, carbs: 200, fats: 60 },
    days: [],
  },
  {
    id: "cutting-v2",
    name: "Cutting Protocol v2",
    type: "nutrition",
    goal: "Cutting",
    assignedCount: 15,
    createdAt: "1 Apr 2026",
    durationWeeks: 8,
    frequency: 0,
    split: "—",
    macros: { protein: 200, carbs: 150, fats: 55 },
    days: [],
  },
  {
    id: "beginner-strength",
    name: "Beginner Strength Foundation",
    type: "training_nutrition",
    goal: "Muscle Gain",
    assignedCount: 4,
    createdAt: "19 May 2026",
    durationWeeks: 8,
    frequency: 3,
    split: "Full Body",
    macros: { protein: 130, carbs: 280, fats: 65 },
    days: [],
  },
  {
    id: "recomp-12wk",
    name: "12-Week Body Recomposition",
    type: "training_nutrition",
    goal: "Recomposition",
    assignedCount: 9,
    createdAt: "14 Feb 2026",
    durationWeeks: 12,
    frequency: 4,
    split: "Upper / Lower",
    macros: { protein: 155, carbs: 220, fats: 65 },
    days: [],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ProgramType, { label: string; className: string }> = {
  training_nutrition: { label: "Training + Nutrition", className: "border-accent/25 bg-accent/8 text-accent" },
  training: { label: "Training Only", className: "border-success/25 bg-success-muted text-success" },
  nutrition: { label: "Nutrition Only", className: "border-warning/25 bg-warning-muted text-warning" },
};

function kcal(p: number, c: number, f: number) {
  return p * 4 + c * 4 + f * 9;
}

// ── MacroRing SVG ─────────────────────────────────────────────────────────────

function MacroRing({
  label,
  value,
  unit,
  pct,
  color,
  trackColor,
}: {
  label: string;
  value: string;
  unit: string;
  pct: number;
  color: string;
  trackColor: string;
}) {
  const r = 26;
  const cx = 32;
  const circ = 2 * Math.PI * r;
  const dash = Math.max((pct / 100) * circ, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 64 64" className="-rotate-90">
          {/* Track */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            strokeWidth="5"
            className={trackColor}
            stroke="currentColor"
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            strokeWidth="5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
            className={color}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-px">
          <span className="text-[13px] font-bold tabular-nums leading-none text-foreground">
            {value}
          </span>
          <span className="text-[9px] font-semibold tracking-wide text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}

// ── WorkoutDayCard ────────────────────────────────────────────────────────────

function WorkoutDayCard({ day }: { day: WeekDay }) {
  const isRest = day.session.kind === "rest";

  if (isRest) {
    return (
      <div className="flex flex-col rounded-xl border border-border/50 bg-muted/10 px-4 py-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50">
          {day.short}
        </span>
        <p className="mt-2 text-sm font-semibold text-muted-foreground/50">Rest</p>
        <p className="mt-0.5 text-xs text-muted-foreground/35">Active recovery</p>
      </div>
    );
  }

  const w = day.session as WorkoutDay;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:border-accent/35 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {day.short}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {w.exerciseCount} ex
        </span>
      </div>
      <p className="mt-2 text-base font-bold text-foreground">{w.name}</p>
      <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-accent">
        {w.sets} sets
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {w.muscles}
      </p>
    </div>
  );
}

// ── Left panel ────────────────────────────────────────────────────────────────

function LeftPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = PROGRAMS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card xl:w-96">
      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-ring/20">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search programs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No programs match &ldquo;{query}&rdquo;
          </p>
        ) : (
          filtered.map((p) => {
            const isSelected = p.id === selectedId;
            const type = TYPE_CONFIG[p.type];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  "group w-full border-b border-border/60 px-5 py-4 text-left transition-colors",
                  isSelected
                    ? "border-l-2 border-l-accent bg-accent/8"
                    : "border-l-2 border-l-transparent hover:bg-muted/40"
                )}
              >
                <p className={cn("text-base font-semibold", isSelected ? "text-foreground" : "text-foreground/85")}>
                  {p.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", type.className)}>
                    {type.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Assigned to <span className="font-semibold text-foreground">{p.assignedCount}</span> clients
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-4 text-center text-xs text-muted-foreground">
        {PROGRAMS.length} programs in library
      </div>
    </aside>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function ProgramDetailPanel({ program }: { program: Program }) {
  const { macros } = program;
  const totalKcal = kcal(macros.protein, macros.carbs, macros.fats);
  const type = TYPE_CONFIG[program.type];

  const workoutDays = program.days.filter((d) => d.session.kind === "workout");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Program header bar */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {program.name}
              </h1>
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", type.className)}>
                {type.label}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-accent" />
                {program.goal}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Created {program.createdAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {program.durationWeeks} weeks
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {program.assignedCount} clients assigned
              </span>
            </div>
          </div>
          <button
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground",
              "transition-colors hover:border-accent/40 hover:bg-muted/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Duplicate
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 xl:px-8">

          {/* ── Dynamic Nutrition Formula ───────────────────────────────── */}
          <section aria-labelledby="nutrition-formula-heading">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2
                    id="nutrition-formula-heading"
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground"
                  >
                    <Zap className="h-4 w-4 text-accent" strokeWidth={2} />
                    Dynamic Nutrition Formula
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scaled multipliers — calculated per client&apos;s bodyweight
                  </p>
                </div>
                <button
                  type="button"
                  title="Open Daily Log Calculator"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:bg-muted/60 hover:text-accent"
                >
                  <Calculator className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="px-5 py-6">
                <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                  <MacroRing
                    label="Protein"
                    value="2.2"
                    unit="g/kg"
                    pct={75}
                    color="text-accent"
                    trackColor="text-border"
                  />
                  <MacroRing
                    label="Carbohydrates"
                    value="4.0"
                    unit="g/kg"
                    pct={88}
                    color="text-success"
                    trackColor="text-border"
                  />
                  <MacroRing
                    label="Fats"
                    value="0.8"
                    unit="g/kg"
                    pct={60}
                    color="text-warning"
                    trackColor="text-border"
                  />

                  <div className="hidden h-20 w-px bg-border sm:block" aria-hidden />

                  <div className="text-center sm:text-left">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Dynamic Expenditure Target
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">
                        TDEE
                      </span>
                      <span className="font-mono text-2xl font-bold text-anomaly">
                        − 500
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">kcal deficit / day</p>
                    <p className="mt-1 text-xs italic text-muted-foreground/70">
                      Calculated from client metrics at sign-up
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-accent/10 px-2 py-1 font-semibold text-accent">
                        P 2.2 g/kg
                      </span>
                      <span className="rounded-md bg-success-muted px-2 py-1 font-semibold text-success">
                        C 4.0 g/kg
                      </span>
                      <span className="rounded-md bg-warning-muted px-2 py-1 font-semibold text-warning">
                        F 0.8 g/kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Training Overview ───────────────────────────────────────── */}
          {program.days.length > 0 && (
            <section aria-labelledby="training-overview-heading">
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        id="training-overview-heading"
                        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground"
                      >
                        <Dumbbell className="h-4 w-4 text-accent" strokeWidth={2} />
                        Training Overview
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Current microcycle structure
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                        <Layers className="h-3 w-3" />
                        Split: <span className="ml-1 font-semibold text-foreground">{program.split}</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                        <RotateCcw className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{program.frequency}×</span> / week
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* 7-day week grid */}
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                    {program.days.map((day) => (
                      <WorkoutDayCard key={day.short} day={day} />
                    ))}
                  </div>

                  {/* Volume summary */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-accent" />
                      <span className="font-semibold text-foreground">
                        {workoutDays.reduce((s, d) => s + (d.session as WorkoutDay).exerciseCount, 0)}
                      </span>{" "}
                      total exercises
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-accent" />
                      <span className="font-semibold text-foreground">
                        {workoutDays.reduce((s, d) => s + (d.session as WorkoutDay).sets, 0)}
                      </span>{" "}
                      weekly sets
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {program.days.filter((d) => d.session.kind === "rest").length} rest days
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="h-2" />
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="shrink-0 border-t border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 xl:px-2">
          <p className="text-sm text-muted-foreground">
            Last modified{" "}
            <span className="font-semibold text-foreground">{program.createdAt}</span>
            {" "}· Assigned to{" "}
            <span className="font-semibold text-foreground">{program.assignedCount} clients</span>
          </p>
          <button
            type="button"
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-card px-6 text-sm font-semibold text-foreground",
              "transition-colors hover:border-accent/50 hover:bg-muted/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "active:scale-[0.98]"
            )}
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Edit Program Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder panel ─────────────────────────────────────────────────────────

function PlaceholderPanel({ program }: { program: Program }) {
  const type = TYPE_CONFIG[program.type];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
        <Dumbbell className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{program.name}</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", type.className)}>
            {type.label}
          </span>
          · {program.assignedCount} clients
        </p>
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">
        Full editor view coming soon. Click{" "}
        <span className="font-semibold text-accent">Edit Program Details</span> to
        open the builder.
      </p>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-card px-6 text-sm font-semibold text-foreground",
          "transition-colors hover:border-accent/50 hover:bg-muted/60"
        )}
      >
        <Pencil className="h-4 w-4" strokeWidth={2} />
        Edit Program Details
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const [selectedId, setSelectedId] = useState("hypertrophy-cut");
  const selected = PROGRAMS.find((p) => p.id === selectedId) ?? PROGRAMS[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-accent" strokeWidth={2} />
            <h1 className="text-base font-bold text-foreground">
              Programs Library
            </h1>
            <span className="ml-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {PROGRAMS.length}
            </span>
          </div>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground",
              "shadow-sm shadow-accent/20 transition-colors hover:bg-accent/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Program
          </button>
        </header>

        {/* Split-screen body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LeftPanel selectedId={selectedId} onSelect={setSelectedId} />

          {selected.days.length > 0 ? (
            <ProgramDetailPanel program={selected} />
          ) : (
            <PlaceholderPanel program={selected} />
          )}
        </div>
      </div>
    </div>
  );
}
