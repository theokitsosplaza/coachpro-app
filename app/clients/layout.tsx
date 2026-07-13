import { Sidebar } from "@/components/sidebar";
import { verifyCoachSession } from "@/lib/dal";

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  const coach = await verifyCoachSession();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar coachName={coach.name ?? undefined} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
