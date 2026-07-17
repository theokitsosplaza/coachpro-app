import { Skeleton } from "@/components/ui/skeleton";

// Default loading fallback for coach routes that lack their own loading.tsx
// (e.g. the dashboard `/` and `/programs`). The shared (coach) layout already
// renders the sidebar/shell, so this fills ONLY the main column — rendering a
// sidebar here would double the one the shell already shows. Routes with a
// tailored skeleton (triage, ai-check-ins, settings, clients) override this.
export default function CoachLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-9"
    >
      <span className="sr-only">Loading…</span>

      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-3 w-96 max-w-full" />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-hair bg-surface p-[22px]">
            <Skeleton className="h-[38px] w-[38px] rounded-[10px]" />
            <Skeleton className="mt-5 h-3 w-24" />
            <Skeleton className="mt-3 h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border border-hair bg-surface p-[22px]">
          <Skeleton className="h-3 w-32" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-surface-deep p-4">
                <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-[10px]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0 rounded-[9px]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-hair bg-surface p-5">
              <Skeleton className="h-3 w-28" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
