import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton for a client's profile page. Content-only (the clients layout
// supplies the sidebar + <main>). Mirrors ClientProfilePage: back link, header
// card, two-column Targets/Analysis cards, weight-trend chart, and history table.
export default function ClientProfileLoading() {
  return (
    <div
      role="status"
      aria-label="Loading client profile"
      className="mx-auto max-w-5xl px-6 py-8 lg:px-8"
    >
      <span className="sr-only">Loading client profile…</span>

      {/* Back link */}
      <Skeleton className="mb-6 h-3 w-40" />

      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-hair bg-surface p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-[14px]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-52 max-w-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-2.5 h-3 w-44" />
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-16 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Two-column: targets + analysis */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Current targets */}
        <div className="rounded-2xl border border-hair bg-surface p-5">
          <Skeleton className="h-3 w-28" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-surface-deep/40 p-3">
                <Skeleton className="mx-auto h-2.5 w-12" />
                <Skeleton className="mx-auto mt-2 h-7 w-10" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-hair pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Latest analysis */}
        <div className="rounded-2xl border border-hair bg-surface p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-4 w-52 max-w-full" />
          <Skeleton className="mt-3 h-3 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Weight trend chart */}
      <div className="mb-6 rounded-2xl border border-hair bg-surface p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-28 w-full rounded-lg" />
      </div>

      {/* Check-in history */}
      <div className="rounded-2xl border border-hair bg-surface">
        <div className="border-b border-hair px-5 py-4">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-hair px-5 py-3.5 last:border-b-0"
          >
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="hidden h-3 w-12 sm:block" />
            <Skeleton className="hidden h-3 w-12 md:block" />
            <Skeleton className="ml-auto h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
