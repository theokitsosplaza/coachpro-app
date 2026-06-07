"use client";

import { Beef, Footprints, Scale, TrendingDown } from "lucide-react";
import type { ClientProfile } from "@/lib/client-profile-data";
import { WeightSparkline } from "@/components/weight-sparkline";
import { cn } from "@/lib/utils";

type NutritionHubProps = {
  profile: ClientProfile;
};

function MacroBar({
  label,
  target,
  actual,
  unit,
  compliancePercent,
}: ClientProfile["macros"][number]) {
  const pct = Math.min(compliancePercent, 100);
  const isOver = compliancePercent > 100;

  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 p-3 transition-colors hover:border-border hover:bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            compliancePercent >= 90 && !isOver && "text-success",
            isOver && label === "Protein" && "text-success",
            compliancePercent < 85 && "text-warning"
          )}
        >
          {compliancePercent}%
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {actual}
        {unit}{" "}
        <span className="font-normal text-muted-foreground">
          / {target}
          {unit} target
        </span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver ? "bg-success" : pct >= 85 ? "bg-accent" : "bg-warning"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StepsBar({
  steps,
  goal,
}: {
  steps: number;
  goal: number;
}) {
  const pct = Math.min(Math.round((steps / goal) * 100), 100);
  const isOnTrack = pct >= 70;
  const stepsFormatted = steps.toLocaleString();
  const goalFormatted = goal.toLocaleString();

  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 p-3 transition-colors hover:border-border hover:bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Footprints className="h-3.5 w-3.5" />
          Daily steps
        </div>
        <span
          className={cn(
            "text-xs font-semibold",
            isOnTrack ? "text-success" : "text-warning"
          )}
        >
          {pct}%
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {stepsFormatted}{" "}
        <span className="font-normal text-muted-foreground">
          / {goalFormatted} goal
        </span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOnTrack ? "bg-success" : "bg-warning"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        7-day average
      </p>
    </div>
  );
}

export function NutritionHub({ profile }: NutritionHubProps) {
  const changeLabel =
    profile.weightChangeKg <= 0
      ? `${profile.weightChangeKg} kg from last week`
      : `+${profile.weightChangeKg} kg from last week`;

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="nutrition-hub-heading"
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Beef className="h-4 w-4 text-accent" strokeWidth={2} />
          <h2
            id="nutrition-hub-heading"
            className="text-sm font-semibold uppercase tracking-wide text-foreground"
          >
            Nutrition Hub
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          7-day weight trend, macro compliance & activity
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        {/* Left: Weight sparkline */}
        <div className="rounded-lg border border-border/80 p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Body weight
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {profile.currentWeightKg} kg
                </span>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-warning" />
                {changeLabel}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              7-day
            </span>
          </div>
          <div className="mt-4">
            <WeightSparkline
              size="lg"
              points={profile.weightTrendKg}
              dayLabels={profile.weightDayLabels}
            />
          </div>
        </div>

        {/* Right: Macro bars + Steps bar */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Macro compliance
            </p>
            <span className="rounded-full bg-success-muted px-2.5 py-0.5 text-xs font-semibold text-success">
              {profile.overallMacroCompliance}% avg
            </span>
          </div>
          <div className="grid gap-3">
            {profile.macros.map((macro) => (
              <MacroBar key={macro.label} {...macro} />
            ))}
            <StepsBar
              steps={profile.dailySteps}
              goal={profile.dailyStepsGoal}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
