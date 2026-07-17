import { AppShell } from "@/components/app-shell";
import { verifyCoachSession } from "@/lib/dal";

/**
 * Shared shell for every authenticated coach route. Renders the sidebar ONCE
 * (via AppShell) instead of each page building its own — this is the DRY home
 * for the responsive/mobile-drawer behaviour. Auth + coach identity resolved
 * here (as app/clients/layout.tsx used to do for the clients subtree alone).
 */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await verifyCoachSession();
  return <AppShell coachName={coach.name ?? undefined}>{children}</AppShell>;
}
