"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeightSparkline } from "@/components/weight-sparkline";

export type StatStatus = "neutral" | "success" | "warning";

type StatCardProps = {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  status?: StatStatus;
  statusText?: string;
  trendText?: string;
  showSparkline?: boolean;
  onClick?: () => void;
};

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  status = "neutral",
  statusText,
  trendText,
  showSparkline = false,
  onClick,
}: StatCardProps) {
  const hasAnomaly = status === "warning";

  const handleClick = () => {
    onClick?.();
    if (typeof window !== "undefined") {
      console.log(`[Progressive disclosure] ${label}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200",
        "hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:translate-y-0 active:shadow-sm",
        hasAnomaly
          ? "border-warning/60 ring-1 ring-warning/25 bg-warning-muted/30"
          : "border-border",
        status === "success" && "border-success/30"
      )}
      aria-label={`${label}: ${value}. Click for details.`}
    >
      {hasAnomaly && (
        <span
          className="absolute -top-px left-4 right-4 h-0.5 rounded-full bg-warning"
          aria-hidden
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="text-xl font-semibold tracking-tight text-card-foreground">
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-muted-foreground">{subValue}</span>
        )}
      </div>

      {showSparkline && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <WeightSparkline />
        </div>
      )}

      {statusText && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            status === "success" && "text-success",
            status === "warning" && "text-warning",
            status === "neutral" && "text-muted-foreground"
          )}
        >
          {statusText}
        </p>
      )}

      {trendText && !showSparkline && (
        <p className="mt-2 text-xs text-muted-foreground">{trendText}</p>
      )}

      {trendText && showSparkline && (
        <p className="mt-1.5 text-xs text-muted-foreground">{trendText}</p>
      )}

      <span className="sr-only">Opens detailed breakdown</span>
    </button>
  );
}
