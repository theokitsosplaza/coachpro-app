import { ChevronDown, User } from "lucide-react";

type ClientHeaderProps = {
  clientName: string;
  weekRange: string;
};

export function ClientHeader({ clientName, weekRange }: ClientHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <button
            type="button"
            className="group flex items-center gap-1.5 text-left transition-colors hover:text-accent"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {clientName}
            </h1>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-accent" />
          </button>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Weekly review · {weekRange}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Check-in ready
        </span>
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          AI-assisted
        </span>
      </div>
    </header>
  );
}
