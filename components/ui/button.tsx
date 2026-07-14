import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Shared button styling for the coach app. One source of truth for height,
// radius, weight, hover/active, and focus ring so every action reads as part
// of the same product. Use <Button> for real buttons and buttonClass() to give
// a next/link the identical look.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

// Controls share the 8px radius (rounded-lg); cards use 12px. That split is the
// app's radius discipline — keep buttons on rounded-lg everywhere.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "whitespace-nowrap transition-[color,background-color,border-color,box-shadow] " +
  "duration-150 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  // Primary carries a hairline top highlight + soft accent glow for depth, so it
  // reads as the one raised surface in any view.
  primary:
    "bg-accent text-accent-foreground " +
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_2px_10px_-2px_rgba(77,124,254,0.45)] " +
    "hover:bg-accent-hover active:bg-accent-press active:shadow-none",
  secondary:
    "border border-border bg-surface-2 text-foreground " +
    "hover:bg-surface-3 hover:border-border-strong active:bg-surface-2",
  ghost: "text-secondary hover:bg-surface-2 hover:text-foreground",
  danger:
    "border border-anomaly/40 bg-anomaly-muted text-anomaly " +
    "hover:bg-anomaly/20 active:bg-anomaly/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function buttonClass(
  opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
): string {
  const { variant = "primary", size = "md", className } = opts;
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
