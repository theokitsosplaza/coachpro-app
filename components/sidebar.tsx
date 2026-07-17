"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Settings,
  Dumbbell,
  AlertTriangle,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "triage", label: "Triage Board", href: "/triage", icon: AlertTriangle },
  { id: "clients", label: "Clients", href: "/clients", icon: Users },
  { id: "ai-checkins", label: "AI Check-ins", href: "/ai-check-ins", icon: Sparkles },
  { id: "programs", label: "Programs", href: "/programs", icon: Dumbbell },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

function resolveActiveItem(pathname: string, override?: string): string {
  if (override) return override;
  if (pathname.startsWith("/triage")) return "triage";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/ai-check-ins")) return "ai-checkins";
  if (pathname.startsWith("/programs")) return "programs";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

type SidebarProps = {
  activeItem?: string;
  coachName?: string;
  /**
   * Optional live count for the amber Triage Board badge (the reference's "2").
   * Presentation is ready, but the badge only renders when a real, positive
   * count is passed — no caller wires it yet, so nothing fabricates a number.
   */
  triageCount?: number;
};

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({ activeItem, coachName, triageCount }: SidebarProps) {
  const pathname = usePathname();
  const active = resolveActiveItem(pathname, activeItem);
  const displayName = coachName?.trim() || "Coach";
  const initials = toInitials(displayName);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-hair bg-sidebar px-4 py-5 text-sidebar-foreground lg:w-60">
      {/* Brand — keep the real Vimafy lockup asset (the design's gradient
          square was a placeholder stand-in for it). Sized to anchor the top of
          the rail; h-11 is near the ceiling before the wordmark clips at the
          narrow w-56 width (lockup ratio ~3.67 → ~162px wide inside px-2). */}
      <div className="flex items-center px-2 pb-5 pt-2.5">
        <Image
          src="/brand/vimafy-lockup-dark.svg"
          alt="Vimafy"
          width={470}
          height={128}
          priority
          unoptimized
          className="h-11 w-auto"
        />
      </div>

      <div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-3">
        Workspace
      </div>

      <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = id === active;
          const rowClass = cn(
            "relative flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive ? "text-white" : "text-nav hover:text-white"
          );

          const inner = (
            <>
              {isActive && (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-[11px] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)]" />
                  <span className="pointer-events-none absolute -left-4 top-1/2 h-[19px] w-[3px] -translate-y-1/2 rounded-r-[3px] bg-accent" />
                </>
              )}
              <Icon className="relative h-[19px] w-[19px] shrink-0" strokeWidth={1.8} />
              <span className="relative flex-1">{label}</span>
              {id === "triage" && triageCount ? (
                <span className="relative rounded-md bg-[color-mix(in_oklab,var(--amber)_18%,transparent)] px-[7px] py-0.5 font-mono text-[11px] font-semibold text-amber">
                  {triageCount}
                </span>
              ) : null}
              {id === "ai-checkins" && (
                <span className="relative rounded-md bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] px-[7px] py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-lite">
                  AI
                </span>
              )}
            </>
          );

          if (href === "#") {
            return (
              <button
                key={id}
                type="button"
                disabled
                className={cn(rowClass, "cursor-not-allowed opacity-50")}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={id}
              href={href}
              className={rowClass}
              aria-current={isActive ? "page" : undefined}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-hair pt-3.5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_oklab,var(--accent)_20%,#14161B)] text-[13px] font-bold text-accent-lite">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-bold leading-tight text-text">{displayName}</p>
            <p className="truncate text-[11.5px] font-semibold text-muted-2">Coach</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted-3 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <LogOut className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
