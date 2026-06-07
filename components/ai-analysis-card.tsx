"use client";

import { Bot, Check, PencilLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AIAnalysisCardProps = {
  analysis: string;
  onApprove: () => void;
  onModify: () => void;
};

export function AIAnalysisCard({
  analysis,
  onApprove,
  onModify,
}: AIAnalysisCardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-card shadow-lg",
        "ring-1 ring-copilot-glow/20"
      )}
      aria-labelledby="ai-action-center-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-copilot-glow/5"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <div className="relative border-b border-accent/15 bg-gradient-to-r from-accent/10 to-transparent px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/25">
            <Bot className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="ai-action-center-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                AI Action Center
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                <Sparkles className="h-3 w-3" />
                Copilot
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Review the weekly synthesis, then approve or adjust the plan.
            </p>
          </div>
        </div>
      </div>

      <div className="relative px-6 py-6 sm:px-8">
        <p className="text-base leading-relaxed text-card-foreground/90">
          {analysis}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onApprove}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground",
              "shadow-md shadow-accent/30 transition-all hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/35",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Approve & update plan
          </button>
          <button
            type="button"
            onClick={onModify}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-5 text-sm font-semibold text-foreground",
              "transition-colors hover:border-accent/40 hover:bg-muted/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <PencilLine className="h-4 w-4" strokeWidth={2} />
            Modify manually
          </button>
        </div>
      </div>
    </section>
  );
}
