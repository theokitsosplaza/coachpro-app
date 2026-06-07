"use client";

import { cn } from "@/lib/utils";

const DEFAULT_POINTS = [83.1, 82.9, 82.8, 82.6, 82.5, 82.4, 82.4];

function toPath(points: number[], width: number, height: number): string {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

type WeightSparklineProps = {
  className?: string;
  ariaLabel?: string;
  points?: number[];
  size?: "sm" | "lg";
  dayLabels?: string[];
};

export function WeightSparkline({
  className,
  ariaLabel = "Weight trend over the past 7 days",
  points = DEFAULT_POINTS,
  size = "sm",
  dayLabels,
}: WeightSparklineProps) {
  const width = size === "lg" ? 280 : 120;
  const height = size === "lg" ? 72 : 36;
  const path = toPath(points, width, height);
  const last = points[points.length - 1];
  const min = Math.min(...points);
  const max = Math.max(...points);

  const isLarge = size === "lg";

  return (
    <div
      className={cn(
        isLarge ? "flex w-full flex-col" : "flex items-end justify-between gap-3",
        className
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn(
          "shrink-0 text-muted-foreground/60",
          size === "lg" ? "h-[4.5rem] w-full max-w-none" : "h-9 w-[7.5rem]"
        )}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`spark-fill-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#spark-fill-${size})`}
          className="text-accent"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        />
        <circle
          cx={width}
          cy={
            height - ((last - min) / (max - min || 1)) * (height - 4) - 2
          }
          r={size === "lg" ? 3.5 : 2.5}
          className="fill-accent"
        />
      </svg>
      {dayLabels && isLarge ? (
        <div className="mt-2 flex w-full justify-between px-0.5 text-[10px] text-muted-foreground">
          {dayLabels.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      ) : !isLarge ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          7d
        </span>
      ) : null}
    </div>
  );
}
