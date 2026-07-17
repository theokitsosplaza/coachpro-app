"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalSkeleton } from "@/components/portal-skeleton";

// Root loading fallback — the default for every route that lacks its own.
//
// The client portal (VitaeForce, white-labeled) shares this fallback too, and
// that is the whole problem this file solves: the portal's (protected) layout
// accesses runtime data (cookies + DB via verifyClientSession), and per Next's
// rules a *segment* loading.js does NOT render a fallback for a layout's runtime
// data (and this app doesn't use Cache Components / PPR, so an inner <Suspense>
// can't shield it either on a hard navigation). The portal's suspension therefore
// bubbles all the way up to THIS root fallback. Rendering the coach dashboard
// skeleton — which includes the coach <Sidebar/> — would flash coach chrome on
// the client's white-labeled portal.
//
// Fix: this fallback is a Client Component that branches on the pathname —
// the VitaeForce portal skeleton for /portal/*, the coach dashboard skeleton
// everywhere else. usePathname() is available (and correct) during the streamed
// SSR of the fallback, so the very first paint is already route-appropriate.
export default function RootLoading() {
  const pathname = usePathname();

  if (pathname?.startsWith("/portal")) {
    return <PortalSkeleton />;
  }

  // Coach dashboard skeleton. Mirrors DashboardClient's shell (sidebar +
  // max-w-7xl main) so a click gives immediate feedback and the real page
  // settles in without a layout jump. Also the default for coach routes that
  // lack their own loading.tsx (e.g. /calendar, /programs).
  return (
    <AppShell>
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
    </AppShell>
  );
}
