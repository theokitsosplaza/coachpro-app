import { getRosterCounts } from "@/lib/roster-data";
import { cn } from "@/lib/utils";

export function RosterTrafficSummary() {
  const counts = getRosterCounts();

  const items = [
    { label: "On track", count: counts.on_track, dot: "bg-success" },
    { label: "Pending review", count: counts.pending_review, dot: "bg-warning" },
    { label: "Action needed", count: counts.action_needed, dot: "bg-anomaly" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {items.map(({ label, count, dot }) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
          <span>
            <span className="font-semibold text-foreground">{count}</span>{" "}
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}
