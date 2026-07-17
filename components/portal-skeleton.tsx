import { Skeleton } from "@/components/ui/skeleton";

// Shared VitaeForce portal loading skeleton. Used in BOTH portal loading
// fallbacks so they stay identical:
//   - app/portal/loading.tsx  (the portal segment's loading fallback), and
//   - app/loading.tsx         (the root fallback, on its /portal branch).
//
// Why the root fallback needs it: the portal's (protected) layout calls
// verifyClientSession(), which reads cookies() AND hits the DB — runtime data in
// a *layout*. Per Next's rules a segment `loading.js` does NOT render a fallback
// for a layout's runtime-data access (and this app has no Cache Components / PPR,
// so an inner <Suspense> can't shield it on a hard navigation either), so the
// portal's suspension bubbles all the way up to the root app/loading.tsx. That
// root fallback therefore branches on the pathname and renders THIS skeleton for
// /portal — so a VitaeForce loading state, never the coach sidebar, shows on the
// white-labeled client portal.
//
// It mirrors the real portal chrome (static VitaeForce header + a skeleton where
// the client name goes) so the header does not shift when the real content
// swaps in, and it never renders any coach-app UI.
export function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Mirrors the real header in app/portal/(protected)/layout.tsx */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface-1 px-4 sm:px-6">
        <span className="font-display text-sm font-semibold text-foreground">
          VitaeForce
        </span>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </header>

      <main
        role="status"
        aria-label="Loading your portal"
        className="mx-auto max-w-3xl px-4 py-8 sm:px-6"
      >
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="mt-3 h-3 w-64 max-w-full" />
        <div className="mt-8 rounded-2xl border border-border-strong bg-surface-2 p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        </div>
      </main>
    </div>
  );
}
