import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton for Settings while its server component loads the coach
// profile. Mirrors SettingsClient's shell: app sidebar + top header bar + a
// w-52 tab nav + a profile form.
export default function SettingsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading settings"
      className="flex h-full overflow-hidden"
    >
      <span className="sr-only">Loading settings…</span>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hair px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-28" />
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Tab nav */}
          <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-hair bg-surface px-2 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </nav>

          {/* Form content */}
          <div className="min-w-0 flex-1 overflow-auto p-8">
            <div className="mx-auto max-w-2xl">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-3 h-3 w-72 max-w-full" />

              <div className="mt-8 space-y-6 rounded-xl border border-hair bg-surface p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-2 h-10 w-full rounded-lg" />
                  </div>
                ))}
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
