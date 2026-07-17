import { PortalSkeleton } from "@/components/portal-skeleton";

// The client portal's segment-level loading fallback. Shares one skeleton
// (components/portal-skeleton.tsx) with the route-aware root fallback in
// app/loading.tsx, so the two stay consistent and neither shows the coach sidebar.
export default function PortalLoading() {
  return <PortalSkeleton />;
}
