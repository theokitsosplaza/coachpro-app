import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton shown while the dashboard server component fetches its data
// and runs the triage engine. Mirrors DashboardClient's shell (sidebar +
// max-w-7xl main) so a click gives immediate feedback and the real page settles
// in without a layout jump.
//
// This is the ROOT loading.tsx, so it is also the default fallback for coach
// routes that lack their own (e.g. /calendar, /programs) — acceptable, they
// share this dark sidebar shell. The client portal is deliberately shielded by
// app/portal/loading.tsx so this coach skeleton never leaks into it.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div
          role="status"
          aria-label="Loading dashboard"
          className="mx-auto max-w-7xl px-6 py-8 lg:px-8"
        >
          <span className="sr-only">Loading dashboard…</span>

          {/* Greeting header */}
          <div className="mb-8">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="mt-3 h-3 w-96 max-w-full" />
          </div>

          {/* Stat cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
                <Skeleton className="mt-3 h-2.5 w-20" />
              </div>
            ))}
          </div>

          {/* Attention list + side column */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <Skeleton className="h-3 w-32" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-40 max-w-full" />
                      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-3 w-28" />
              {/* Recent check-ins */}
              <div className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="ml-auto h-3 w-10" />
                  </div>
                ))}
              </div>
              {/* Weekly check-in pulse */}
              <div className="mt-6 flex items-end gap-2">
                {[32, 56, 24, 64, 40, 20, 48].map((h, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: h }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
