import type { RosterStatus } from "@/lib/roster-data";
import { ROSTER_STATUS_LABELS } from "@/lib/roster-data";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RosterStatus, string> = {
  on_track: "bg-success-muted text-success border-success/25",
  pending_review: "bg-warning-muted text-warning border-warning/30",
  action_needed: "bg-anomaly-muted text-anomaly border-anomaly/30",
};

const STATUS_DOT: Record<RosterStatus, string> = {
  on_track: "bg-success",
  pending_review: "bg-warning",
  action_needed: "bg-anomaly",
};

type RosterStatusBadgeProps = {
  status: RosterStatus;
  className?: string;
};

export function RosterStatusBadge({ status, className }: RosterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
        aria-hidden
      />
      {ROSTER_STATUS_LABELS[status]}
    </span>
  );
}
