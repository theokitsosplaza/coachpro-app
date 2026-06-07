"use client";

import { CheckCircle2, CircleDashed, Dumbbell, XCircle } from "lucide-react";
import type { ClientProfile, WorkoutStatus } from "@/lib/client-profile-data";
import { cn } from "@/lib/utils";

type TrainingLogProps = {
  profile: ClientProfile;
};

const STATUS_CONFIG: Record<
  WorkoutStatus,
  { label: string; icon: typeof CheckCircle2; className: string; cardClass: string }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "text-success",
    cardClass: "border-success/25 bg-success-muted/40 hover:border-success/40",
  },
  missed: {
    label: "Missed",
    icon: XCircle,
    className: "text-anomaly",
    cardClass: "border-anomaly/30 bg-anomaly-muted/50 hover:border-anomaly/45",
  },
  pending: {
    label: "Pending",
    icon: CircleDashed,
    className: "text-muted-foreground",
    cardClass: "border-border bg-muted/20 hover:border-accent/30 hover:bg-muted/40",
  },
};

export function TrainingLog({ profile }: TrainingLogProps) {
  const completed = profile.workouts.filter((w) => w.status === "completed").length;

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="training-log-heading"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-accent" strokeWidth={2} />
          <div>
            <h2
              id="training-log-heading"
              className="text-sm font-semibold uppercase tracking-wide text-foreground"
            >
              Training Log
            </h2>
            <p className="text-xs text-muted-foreground">Current microcycle</p>
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {completed}/{profile.workouts.length} sessions
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-5">
        {profile.workouts.map((workout) => {
          const config = STATUS_CONFIG[workout.status];
          const Icon = config.icon;

          return (
            <div
              key={workout.id}
              className={cn(
                "flex flex-col rounded-lg border p-4 transition-all duration-200",
                config.cardClass
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {workout.scheduledDay}
                </span>
                <Icon className={cn("h-4 w-4 shrink-0", config.className)} />
              </div>
              <p className="mt-2 font-semibold text-foreground">{workout.name}</p>
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  config.className
                )}
              >
                {config.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
