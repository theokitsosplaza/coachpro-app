import type { Metadata } from 'next'

// Client-facing branding. The root layout's metadata (title "Vimafy | AI
// Check-ins" and a coach-framed description) is inherited by every route,
// including the portal. This portal-scoped layout overrides title +
// description for /portal/* ONLY, so clients see "VitaeForce" while the
// coach app keeps the root brand. Root uses a plain-string title (no
// title.template), so this value is used verbatim, not augmented.
export const metadata: Metadata = {
  title: 'VitaeForce',
  description: 'Your VitaeForce portal',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pass-through: no <html>/<body> here (the root layout provides them). This
  // layout exists purely to scope the metadata above to portal routes.
  return <>{children}</>
}
