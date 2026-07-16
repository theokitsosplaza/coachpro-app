import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Presentation-only loading placeholder. Pulses using the app's muted token so
// skeletons read as part of the dark theme, not a generic grey spinner. Purely
// additive — no data, no logic — used exclusively by route-level loading.tsx
// files to give an instant visual response while a server component fetches.
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
    />
  );
}
