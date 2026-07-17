import { Dumbbell } from "lucide-react";

export default function ProgramsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-10 text-center">
        <div className="mb-[22px] flex h-16 w-16 items-center justify-center rounded-[18px] border border-hair bg-surface text-muted-3">
          <Dumbbell className="h-[30px] w-[30px]" strokeWidth={1.7} />
        </div>
        <h1 className="mb-2.5 font-display text-[22px] font-extrabold tracking-[-0.01em] text-text">Programs</h1>
        <p className="mb-[22px] max-w-[420px] text-sm leading-relaxed text-muted-1">
          Build reusable training and nutrition templates, assign them to clients, and track results over time.
        </p>
        <span className="inline-flex items-center gap-[7px] rounded-full border border-[color-mix(in_oklab,var(--accent)_26%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-[15px] py-2 text-[12.5px] font-bold text-accent-lite">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-lite)]" />
          Coming soon
        </span>
      </div>
  );
}
