import { Skeleton } from "@/components/ui/skeleton";

// GUARD (not one of the coach pages): the dashboard skeleton lives at the root
// app/loading.tsx, which would otherwise cascade as the fallback into the
// client-facing VitaeForce portal. This neutral, coach-sidebar-free skeleton
// shields the portal so the coach dashboard skeleton never appears here. It
// matches the portal's softer aesthetic (bg-bg + rounded-2xl surface cards).
export default function PortalLoading() {
  return (
    <main
      role="status"
      aria-label="Loading"
      className="min-h-screen bg-bg px-4 py-10"
    >
      <span className="sr-only">Loading…</span>
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="mt-3 h-3 w-64 max-w-full" />

        {/* Content card */}
        <div className="mt-8 rounded-2xl border border-border-strong bg-surface-2 p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
