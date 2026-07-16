import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton for the Triage Board while its server component loads every
// client + runs the engine. Mirrors TriageBoardClient's shell (sidebar +
// max-w-4xl main) and its grouped list of client rows.
export default function TriageLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div
          role="status"
          aria-label="Loading triage board"
          className="mx-auto max-w-4xl px-6 py-8 lg:px-8"
        >
          <span className="sr-only">Loading triage board…</span>

          {/* Page header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-3 h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>

          {/* Client rows */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4"
              >
                <Skeleton className="h-10 w-1 shrink-0 rounded-full" />
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full sm:block" />
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
