"use client";

import { useState } from "react";
import { Activity, Lock, Moon } from "lucide-react";
import type { ClientProfile } from "@/lib/client-profile-data";
import { cn } from "@/lib/utils";

type BiofeedbackNotesProps = {
  profile: ClientProfile;
};

function MetricGauge({
  label,
  value,
  sublabel,
  icon: Icon,
  max = 10,
  warningAbove,
}: {
  label: string;
  value: number;
  sublabel: string;
  icon: typeof Moon;
  max?: number;
  warningAbove?: number;
}) {
  const pct = (value / max) * 100;
  const isWarning = warningAbove !== undefined && value >= warningAbove;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 p-4 transition-colors hover:border-border hover:bg-muted/30",
        isWarning && "border-warning/40 bg-warning-muted/30"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={2} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
        <span className="text-sm font-normal text-muted-foreground"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full",
            isWarning ? "bg-warning" : "bg-accent"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

export function BiofeedbackNotes({ profile }: BiofeedbackNotesProps) {
  const [notes, setNotes] = useState(profile.coachNotesDefault);

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="biofeedback-heading"
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" strokeWidth={2} />
          <h2
            id="biofeedback-heading"
            className="text-sm font-semibold uppercase tracking-wide text-foreground"
          >
            Biofeedback & Coach Notes
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Client-reported signals & private coach annotations
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricGauge
            label="Sleep quality"
            value={profile.sleepQuality}
            sublabel={profile.sleepLabel}
            icon={Moon}
            warningAbove={7}
          />
          <MetricGauge
            label="Fatigue (RPE)"
            value={profile.fatigueRpe}
            sublabel={profile.fatigueLabel}
            icon={Activity}
            warningAbove={7}
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Coach notes
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] normal-case">
              Private
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Add observations, plan adjustments, or follow-up items..."
            className={cn(
              "min-h-[140px] flex-1 resize-y rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground",
              "placeholder:text-muted-foreground/70 transition-colors",
              "hover:border-accent/30 focus:border-accent/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/30"
            )}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Only visible to your coaching team. Auto-saves when connected to API.
          </p>
        </div>
      </div>
    </section>
  );
}
