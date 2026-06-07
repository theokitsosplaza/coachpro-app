"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { RosterClient } from "@/lib/roster-data";
import { RosterStatusBadge } from "@/components/roster-status-badge";
import { cn } from "@/lib/utils";

type MasterRosterTableProps = {
  clients: RosterClient[];
};

function sortByPriority(clients: RosterClient[]): RosterClient[] {
  const order = { action_needed: 0, pending_review: 1, on_track: 2 };
  return [...clients].sort((a, b) => order[a.status] - order[b.status]);
}

export function MasterRosterTable({ clients }: MasterRosterTableProps) {
  const router = useRouter();
  const sorted = sortByPriority(clients);

  const navigate = (id: string) => {
    router.push(`/clients/${id}`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Client
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current goal
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                This week
              </th>
              <th className="w-8 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((client) => {
              const needsAction = client.status === "action_needed";

              return (
                <tr
                  key={client.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate(client.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(client.id);
                    }
                  }}
                  className={cn(
                    "group cursor-pointer transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    needsAction &&
                      "border-l-2 border-l-anomaly bg-anomaly-muted/40 hover:bg-anomaly-muted/55",
                    !needsAction && "border-l-2 border-l-transparent"
                  )}
                  aria-label={`${client.name}, ${client.goal}. View profile.`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          needsAction
                            ? "bg-anomaly/10 text-anomaly"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {client.initials}
                      </div>
                      <div>
                        <span className="font-medium text-card-foreground">
                          {client.name}
                        </span>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground sm:hidden">
                          Macros: {client.macrosPercent}% | Workouts:{" "}
                          {client.workoutsCompleted}/{client.workoutsPlanned}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {client.goal}
                  </td>
                  <td className="px-4 py-3">
                    <RosterStatusBadge status={client.status} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      Macros: {client.macrosPercent}% | Workouts:{" "}
                      {client.workoutsCompleted}/{client.workoutsPlanned}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
