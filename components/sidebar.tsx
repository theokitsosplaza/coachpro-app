"use client";

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
};

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({ activeItem, coachName }: SidebarProps) {
  const pathname = usePathname();
  const active = resolveActiveItem(pathname, activeItem);
  const displayName = coachName?.trim() || "Coach";
  const initials = toInitials(displayName);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-accent bg-sidebar text-sidebar-foreground lg:w-60">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-accent px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Dumbbell className="h-4 w-4 text-accent-foreground" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight">Vimafy</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = id === active;
          const className = cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-active text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          );

          if (href === "#") {
            return (
              <button
                key={id}
                type="button"
                disabled
                className={cn(className, "cursor-not-allowed opacity-50")}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                {label}
              </button>
            );
          }

          return (
            <Link
              key={id}
              href={href}
              className={className}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {label}
              {id === "ai-checkins" && (
                <span className="ml-auto rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-accent p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-sidebar-muted">Coach</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
