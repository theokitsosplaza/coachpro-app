"use client";

import { Activity, Moon, Salad } from "lucide-react";
import type { ClientProfile } from "@/lib/client-profile-data";
import { cn } from "@/lib/utils";

type BiofeedbackRecoveryProps = {
  profile: ClientProfile;
};

type GaugeConfig = {
  label: string;
  value: number;
  max: number;
  sublabel: string;
  icon: typeof Moon;
  /** value >= this → amber warning */
  warningAbove?: number;
  /** value <= this → green good signal */
  goodBelow?: number;
};

function RecoveryGauge({
  label,
  value,
  max,
  sublabel,
  icon: Icon,
  warningAbove,
  goodBelow,
}: GaugeConfig) {
  const pct = (value / max) * 100;
  const isWarning = warningAbove !== undefined && value >= warningAbove;
  const isGood =
    goodBelow !== undefined
      ? value <= goodBelow
      : !isWarning && pct >= 60;

  const barColor = isWarning
    ? "bg-warning"
    : isGood
      ? "bg-success"
      : "bg-accent";

  const cardClass = isWarning
    ? "border-warning/35 bg-warning-muted/25"
    : isGood
      ? "border-success/25 bg-success-muted/20"
      : "border-border/80";

  // Segment dots — visual at-a-glance for the coach
  const segments = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors hover:border-border hover:bg-muted/20",
        cardClass
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {label}
        </div>
        <span
          className={cn(
            "text-base font-bold tabular-nums tracking-tight",
            isWarning && "text-warning",
            isGood && "text-success",
            !isWarning && !isGood && "text-foreground"
          )}
        >
          {value}
          <span className="text-xs font-normal text-muted-foreground">
            /{max}
          </span>
        </span>
      </div>

      {/* Segmented dots */}
      <div className="mt-3 flex gap-1">
        {segments.map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s <= value ? barColor : "bg-border"
            )}
          />
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {sublabel}
      </p>
    </div>
  );
}

export function BiofeedbackRecovery({ profile }: BiofeedbackRecoveryProps) {
  const gauges: GaugeConfig[] = [
    {
      label: "Sleep quality",
      value: profile.sleepQuality,
      max: 10,
      sublabel: profile.sleepLabel,
      icon: Moon,
      goodBelow: 7.5,
      warningAbove: 4, // low sleep is a warning (inverted — low = bad here)
    },
    {
      label: "Stress level",
      value: profile.stressLevel,
      max: 10,
      sublabel: profile.stressLabel,
      icon: Activity,
      warningAbove: 7,
      goodBelow: 4,
    },
    {
      label: "Hunger / digestion",
      value: profile.hungerScore,
      max: profile.hungerMax,
      sublabel: profile.hungerLabel,
      icon: Salad,
      warningAbove: undefined,
      goodBelow: undefined,
    },
  ];

  // Sleep: low value = bad (invert the warning logic for sleep)
  const sleepGauge: GaugeConfig = {
    ...gauges[0],
    warningAbove: undefined,
    goodBelow: undefined,
  };

  function sleepCardClass(v: number) {
    if (v < 5) return "border-anomaly/30 bg-anomaly-muted/20";
    if (v < 7) return "border-warning/35 bg-warning-muted/25";
    return "border-success/25 bg-success-muted/20";
  }

  function sleepBarColor(v: number) {
    if (v < 5) return "bg-anomaly";
    if (v < 7) return "bg-warning";
    return "bg-success";
  }

  function sleepTextColor(v: number) {
    if (v < 5) return "text-anomaly";
    if (v < 7) return "text-warning";
    return "text-success";
  }

  const sleep = profile.sleepQuality;
  const sleepSegments = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="biofeedback-recovery-heading"
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-accent" strokeWidth={2} />
          <h2
            id="biofeedback-recovery-heading"
            className="text-sm font-semibold uppercase tracking-wide text-foreground"
          >
            Biofeedback & Recovery
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Client-reported signals from weekly check-in
        </p>
      </div>

      <div className="grid gap-3 p-5 sm:p-6">
        {/* Sleep — custom inverted logic */}
        <div
          className={cn(
            "rounded-lg border p-4 transition-colors hover:border-border",
            sleepCardClass(sleep)
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Moon className="h-3.5 w-3.5" strokeWidth={2} />
              Sleep quality
            </div>
            <span className={cn("text-base font-bold tabular-nums tracking-tight", sleepTextColor(sleep))}>
              {sleep}
              <span className="text-xs font-normal text-muted-foreground">/10</span>
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {sleepSegments.map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  s <= sleep ? sleepBarColor(sleep) : "bg-border"
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {profile.sleepLabel}
          </p>
        </div>

        {/* Stress */}
        <RecoveryGauge
          label="Stress level"
          value={profile.stressLevel}
          max={10}
          sublabel={profile.stressLabel}
          icon={Activity}
          warningAbove={7}
          goodBelow={4}
        />

        {/* Hunger / Digestion */}
        <RecoveryGauge
          label="Hunger / digestion"
          value={profile.hungerScore}
          max={profile.hungerMax}
          sublabel={profile.hungerLabel}
          icon={Salad}
        />
      </div>
    </section>
  );
}
