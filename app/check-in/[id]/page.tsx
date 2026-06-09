"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Dumbbell,
  Scale,
  Beef,
  Moon,
  Activity,
  Salad,
  ChevronRight,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { getClientProfile } from "@/lib/client-profile-data";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type MacroKey = "Protein" | "Carbs" | "Fats";

type ContextRange = {
  /** inclusive lower bound */
  min: number;
  /** inclusive upper bound */
  max: number;
  text: string;
  color: "success" | "accent" | "warning" | "anomaly";
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function calcAverage(days: string[]): string {
  const nums = days.map((d) => parseFloat(d)).filter((n) => !isNaN(n));
  if (nums.length === 0) return "";
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return String(Math.round(avg));
}

function getContextLabel(
  value: number,
  ranges: ContextRange[]
): ContextRange | undefined {
  return [...ranges]
    .sort((a, b) => b.min - a.min)
    .find((r) => value >= r.min && value <= r.max);
}

const SLEEP_RANGES: ContextRange[] = [
  { min: 1, max: 3, text: "Poor sleep — recovery likely impacted", color: "anomaly" },
  { min: 3.5, max: 5.5, text: "Below average — some disruption", color: "warning" },
  { min: 6, max: 7.5, text: "Moderate — mostly restful", color: "accent" },
  { min: 8, max: 9, text: "Good sleep — solid recovery", color: "success" },
  { min: 9.5, max: 10, text: "Excellent — fully rested", color: "success" },
];

const STRESS_RANGES: ContextRange[] = [
  { min: 1, max: 3, text: "Calm and collected", color: "success" },
  { min: 3.5, max: 6, text: "Moderate but manageable", color: "accent" },
  { min: 6.5, max: 8, text: "Elevated — monitor closely", color: "warning" },
  { min: 8.5, max: 10, text: "High anxiety / Overwhelmed", color: "anomaly" },
];

const HUNGER_RANGES: ContextRange[] = [
  { min: 1, max: 1.5, text: "Well satiated — great portion control", color: "success" },
  { min: 2, max: 2.5, text: "Comfortably full — on target", color: "success" },
  { min: 3, max: 3, text: "Neutral — balanced intake", color: "accent" },
  { min: 3.5, max: 4, text: "Noticeable hunger — keep an eye on this", color: "warning" },
  { min: 4.5, max: 5, text: "Very hungry — may need a caloric review", color: "warning" },
];

const COLOR_CLASSES: Record<ContextRange["color"], { text: string; bg: string; dot: string }> = {
  success: { text: "text-success", bg: "bg-success-muted/60", dot: "bg-success" },
  accent: { text: "text-accent", bg: "bg-accent/8", dot: "bg-accent" },
  warning: { text: "text-warning", bg: "bg-warning-muted/60", dot: "bg-warning" },
  anomaly: { text: "text-anomaly", bg: "bg-anomaly-muted/60", dot: "bg-anomaly" },
};

// ── Primitives ───────────────────────────────────────────────────────────────

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Scale;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {children}
      </span>
    </div>
  );
}

function NumericInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex h-14 items-center overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20">
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder ?? "0"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent px-4 text-2xl font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <span className="pr-4 text-sm font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function WorkoutToggle({
  name,
  day,
  checked,
  onToggle,
}: {
  name: string;
  day: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
        checked
          ? "border-success/40 bg-success-muted/50"
          : "border-border bg-muted/20 hover:border-accent/30 hover:bg-muted/40"
      )}
    >
      {checked ? (
        <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
      ) : (
        <Circle className="h-6 w-6 shrink-0 text-border" />
      )}
      <div className="flex-1">
        <p className={cn("text-base font-semibold transition-colors", checked ? "text-success" : "text-foreground")}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground">{day}</p>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          checked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        )}
      >
        {checked ? "Done" : "Tap to mark"}
      </span>
    </button>
  );
}

// ── Daily Log Helper ─────────────────────────────────────────────────────────

function DailyLogHelper({
  macroLabel,
  unit,
  days,
  onDaysChange,
  onClose,
}: {
  macroLabel: string;
  unit: string;
  days: string[];
  onDaysChange: (days: string[]) => void;
  onClose: () => void;
}) {
  const avg = calcAverage(days);
  const filledCount = days.filter((d) => d !== "").length;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between border-b border-accent/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-accent">
            {macroLabel} — enter each day
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-0.5 text-[10px] font-medium text-accent/70 hover:bg-accent/10 hover:text-accent"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 p-3">
        {DAY_LABELS.map((day, i) => (
          <div key={day}>
            <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {day}
            </p>
            <input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={days[i]}
              onChange={(e) => {
                const next = [...days];
                next[i] = e.target.value;
                onDaysChange(next);
              }}
              className="h-10 w-full rounded-lg border border-border bg-muted/30 text-center text-sm font-semibold text-foreground placeholder:text-muted-foreground/30 focus:border-accent focus:outline-none focus:ring-1 focus:ring-ring/20"
            />
          </div>
        ))}
      </div>

      {filledCount > 0 && (
        <div className="flex items-center justify-between border-t border-accent/20 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Avg across{" "}
            <span className="font-semibold text-foreground">{filledCount}</span>{" "}
            day{filledCount !== 1 ? "s" : ""}
          </p>
          <span className="text-sm font-bold text-accent">
            {avg} {unit}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Macro Input with Helper ──────────────────────────────────────────────────

function MacroInputWithHelper({
  label,
  unit,
  value,
  onChange,
  hint,
  isHelperOpen,
  onToggleHelper,
  days,
  onDaysChange,
}: {
  label: MacroKey;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
  isHelperOpen: boolean;
  onToggleHelper: () => void;
  days: string[];
  onDaysChange: (days: string[]) => void;
}) {
  const handleDaysChange = (next: string[]) => {
    onDaysChange(next);
    const avg = calcAverage(next);
    if (avg !== "") onChange(avg);
  };

  return (
    <div className="col-span-3 grid grid-cols-3 gap-3">
      <div className="col-span-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onToggleHelper}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
            isHelperOpen
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border bg-muted/40 text-muted-foreground hover:border-accent/30 hover:text-accent"
          )}
        >
          <CalendarDays className="h-2.5 w-2.5" />
          Log 7 days
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 transition-transform",
              isHelperOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Main compact input — single column inside the 3-col macro grid row */}
      <div className="col-span-3">
        <div className="flex h-14 items-center overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20">
          <input
            type="number"
            inputMode="numeric"
            placeholder={hint}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent px-4 text-2xl font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <span className="pr-4 text-sm font-medium text-muted-foreground">{unit}</span>
        </div>
      </div>

      {isHelperOpen && (
        <div className="col-span-3">
          <DailyLogHelper
            macroLabel={label}
            unit={unit}
            days={days}
            onDaysChange={handleDaysChange}
            onClose={onToggleHelper}
          />
        </div>
      )}
    </div>
  );
}

// ── Biofeedback Slider with context ──────────────────────────────────────────

function BiofeedbackSlider({
  label,
  icon: Icon,
  value,
  max,
  onChange,
  lowLabel,
  highLabel,
  contextRanges,
}: {
  label: string;
  icon: typeof Moon;
  value: number;
  max: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  contextRanges: ContextRange[];
}) {
  const pct = ((value - 1) / (max - 1)) * 100;
  const ctx = getContextLabel(value, contextRanges);
  const colors = ctx ? COLOR_CLASSES[ctx.color] : COLOR_CLASSES.accent;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      {/* Header: label + current value */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
          {label}
        </div>
        <span className={cn("min-w-[2.5rem] text-right text-xl font-bold tabular-nums", colors.text)}>
          {value}
          <span className="text-xs font-normal text-muted-foreground">/{max}</span>
        </span>
      </div>

      {/* Track */}
      <div className="relative mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full transition-all", colors.dot)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={1}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
        {/* Custom thumb */}
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all",
            colors.dot
          )}
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Endpoint labels */}
      <div className="mt-2.5 flex justify-between text-[10px] text-muted-foreground/70">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>

      {/* Dynamic context label */}
      {ctx && (
        <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2", colors.bg)}>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colors.dot)} aria-hidden />
          <span className={cn("text-xs font-medium", colors.text)}>{ctx.text}</span>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_7 = (): string[] => Array(7).fill("");

export default function CheckInPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const profile = getClientProfile(id);

  const name = profile?.name ?? "there";
  const firstName = name.split(" ")[0];

  // Core metrics
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState("");

  // Macros — single average value
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  // 7-day logs per macro
  const [proteinDays, setProteinDays] = useState<string[]>(EMPTY_7);
  const [carbsDays, setCarbsDays] = useState<string[]>(EMPTY_7);
  const [fatsDays, setFatsDays] = useState<string[]>(EMPTY_7);

  // Which helper is open (only one at a time)
  const [helperOpen, setHelperOpen] = useState<MacroKey | null>(null);
  const toggleHelper = (key: MacroKey) =>
    setHelperOpen((prev) => (prev === key ? null : key));

  // Workouts
  const workoutDefaults = (profile?.workouts ?? []).reduce<Record<string, boolean>>(
    (acc, w) => { acc[w.id] = w.status === "completed"; return acc; },
    {}
  );
  const [completedWorkouts, setCompletedWorkouts] = useState<Record<string, boolean>>(workoutDefaults);
  const toggleWorkout = (wid: string) =>
    setCompletedWorkouts((prev) => ({ ...prev, [wid]: !prev[wid] }));

  // Biofeedback
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(5);
  const [hunger, setHunger] = useState(3);

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    console.log("[check-in] submitted", {
      weight, steps, protein, carbs, fats,
      proteinDays, carbsDays, fatsDays,
      completedWorkouts, sleep, stress, hunger,
    });
    setSubmitted(true);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-muted">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Check-in submitted!</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Great work, {firstName}. Your coach will review your week shortly.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-muted px-6 text-sm font-semibold text-foreground"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-accent" strokeWidth={2.5} />
            <span className="text-sm font-bold tracking-tight text-foreground">Vimafy</span>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            Weekly check-in
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-5 pt-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Let&apos;s log your week,{" "}
            <span className="text-accent">{firstName}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.weekRange ?? "Current week"} · Takes about 2 minutes
          </p>
        </div>

        {/* Core Metrics */}
        <SectionCard>
          <SectionLabel icon={Scale}>Core metrics</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              label="Weight"
              unit="kg"
              value={weight}
              onChange={setWeight}
              placeholder={String(profile?.currentWeightKg ?? "0")}
            />
            <NumericInput
              label="Daily steps"
              unit="steps"
              value={steps}
              onChange={setSteps}
              placeholder={String(profile?.dailySteps ?? "0")}
            />
          </div>
        </SectionCard>

        {/* Nutrition */}
        <SectionCard>
          <SectionLabel icon={Beef}>Nutrition</SectionLabel>
          <p className="mb-4 text-xs text-muted-foreground">
            Enter your average, or tap{" "}
            <span className="font-semibold text-accent">Log 7 days</span> to
            let us calculate it for you.
          </p>
          <div className="space-y-5">
            {(
              [
                { key: "Protein" as MacroKey, value: protein, set: setProtein, days: proteinDays, setDays: setProteinDays, hint: String(profile?.macros[0]?.actual ?? "") },
                { key: "Carbs" as MacroKey, value: carbs, set: setCarbs, days: carbsDays, setDays: setCarbsDays, hint: String(profile?.macros[1]?.actual ?? "") },
                { key: "Fats" as MacroKey, value: fats, set: setFats, days: fatsDays, setDays: setFatsDays, hint: String(profile?.macros[2]?.actual ?? "") },
              ]
            ).map(({ key, value, set, days, setDays, hint }) => (
              <MacroInputWithHelper
                key={key}
                label={key}
                unit="g"
                value={value}
                onChange={set}
                hint={hint}
                isHelperOpen={helperOpen === key}
                onToggleHelper={() => toggleHelper(key)}
                days={days}
                onDaysChange={setDays}
              />
            ))}
          </div>
        </SectionCard>

        {/* Training */}
        <SectionCard>
          <SectionLabel icon={Dumbbell}>Training</SectionLabel>
          <p className="mb-4 text-xs text-muted-foreground">
            Tap each session you completed this week
          </p>
          <div className="space-y-2">
            {(profile?.workouts ?? []).map((w) => (
              <WorkoutToggle
                key={w.id}
                name={w.name}
                day={w.scheduledDay}
                checked={completedWorkouts[w.id] ?? false}
                onToggle={() => toggleWorkout(w.id)}
              />
            ))}
          </div>
        </SectionCard>

        {/* Biofeedback */}
        <SectionCard>
          <SectionLabel icon={Moon}>How did you feel?</SectionLabel>
          <p className="mb-4 text-xs text-muted-foreground">
            Honest answers help your coach optimise your plan
          </p>
          <div className="space-y-4">
            <BiofeedbackSlider
              label="Sleep quality"
              icon={Moon}
              value={sleep}
              max={10}
              onChange={setSleep}
              lowLabel="Poor"
              highLabel="Great"
              contextRanges={SLEEP_RANGES}
            />
            <BiofeedbackSlider
              label="Stress level"
              icon={Activity}
              value={stress}
              max={10}
              onChange={setStress}
              lowLabel="Very relaxed"
              highLabel="Very stressed"
              contextRanges={STRESS_RANGES}
            />
            <BiofeedbackSlider
              label="Hunger / digestion"
              icon={Salad}
              value={hunger}
              max={5}
              onChange={setHunger}
              lowLabel="Satisfied"
              highLabel="Very hungry"
              contextRanges={HUNGER_RANGES}
            />
          </div>
        </SectionCard>

        <div className="h-4" />
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-bold text-accent-foreground",
              "shadow-lg shadow-accent/25 transition-all active:scale-[0.98] hover:bg-accent/90"
            )}
          >
            Submit check-in
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
