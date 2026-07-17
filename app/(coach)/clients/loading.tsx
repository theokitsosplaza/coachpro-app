import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton for the Clients roster. Content-only: app/clients/layout.tsx
// already renders the sidebar + <main>, so this fills the main column and
// mirrors ClientsPage's header + RosterClient's search bar and row list.
export default function ClientsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading clients"
      className="mx-auto max-w-5xl px-6 py-8 lg:px-8"
    >
      <span className="sr-only">Loading clients…</span>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-3 h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-lg" />
      </div>

      {/* Search bar */}
      <Skeleton className="mb-4 h-10 w-full rounded-lg" />

      {/* Roster rows */}
      <div className="overflow-hidden rounded-xl border border-hair bg-surface">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-hair px-5 py-4 last:border-b-0"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-44 max-w-full" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
            <Skeleton className="hidden h-3 w-24 sm:block" />
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
