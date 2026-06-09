import { Dumbbell } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default function ProgramsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Dumbbell className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Programs</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Build reusable training and nutrition templates, assign them to clients, and track results over time.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
          Coming soon
        </span>
      </div>
    </div>
  );
}
