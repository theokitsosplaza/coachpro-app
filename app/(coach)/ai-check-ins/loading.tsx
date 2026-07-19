import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton for the AI Check-ins queue while its server component loads
// the client queue. Mirrors AICheckInsClient's shell: app sidebar + a two-pane
// layout (w-80/xl:w-96 queue column + a right analysis panel).
export default function AiCheckInsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading AI check-ins"
      className="flex h-full overflow-hidden"
    >
      <span className="sr-only">Loading AI check-ins…</span>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Queue column */}
        <aside className="flex w-[334px] shrink-0 flex-col border-r border-hair bg-sidebar max-[860px]:w-full">
          <div className="border-b border-hair px-5 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
          <div className="flex-1 space-y-1 overflow-hidden p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-32 max-w-full" />
                  <Skeleton className="mt-2 h-2.5 w-20" />
                </div>
                <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </aside>

        {/* Right analysis panel */}
        <div className="min-w-0 flex-1 overflow-hidden p-8 max-[860px]:hidden">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="mt-3 h-3 w-40" />

            <div className="mt-8 rounded-xl border border-hair bg-surface p-6">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>

            <div className="mt-6 rounded-xl border border-hair bg-surface p-6">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-6 h-10 w-40 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
