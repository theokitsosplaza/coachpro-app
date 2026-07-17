"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

/**
 * The authenticated coach shell: the sidebar rendered ONCE for every coach
 * route (via app/(coach)/layout.tsx), plus the responsive behaviour.
 *
 * Desktop (> 860px): a static sidebar rail beside a scrolling main column —
 * visually the same shell every coach page used to build itself. The whole
 * viewport is fixed height (h-dvh) with the main column scrolling, so the
 * sidebar stays pinned (this is what settings/programs/check-ins already did;
 * dashboard/triage/clients previously let it scroll away with the page).
 *
 * Mobile (≤ 860px, the reference's breakpoint): the sidebar goes off-canvas
 * (translateX(-100%)) and slides in as a drawer over a scrim; a top bar with a
 * hamburger + brand appears; main content is full-width. Opens on hamburger;
 * closes on scrim tap, Escape, and navigation (a nav-item tap changes route).
 */
export function AppShell({
  coachName,
  children,
}: {
  coachName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (i.e. a nav item was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Sidebar — desktop: static rail; ≤860px: fixed off-canvas drawer.
          `flex` so the <aside> stretches full height and its mt-auto footer
          pins to the bottom in both modes. */}
      <div
        className={cn(
          "z-50 flex shrink-0",
          "max-[860px]:fixed max-[860px]:inset-y-0 max-[860px]:left-0",
          "max-[860px]:transition-transform max-[860px]:duration-200 max-[860px]:ease-out",
          "motion-reduce:max-[860px]:transition-none",
          open ? "max-[860px]:translate-x-0" : "max-[860px]:-translate-x-full"
        )}
      >
        <Sidebar coachName={coachName} />
      </div>

      {/* Scrim — only rendered ≤860px while the drawer is open. */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 min-[861px]:hidden"
        />
      )}

      {/* Content column: mobile top bar (≤860px) + scrolling main. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-hair bg-bg px-4 py-3 min-[861px]:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex items-center justify-center rounded-lg border border-hair-2 p-2 text-text transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <Image
            src="/brand/vimafy-lockup-dark.svg"
            alt="Vimafy"
            width={470}
            height={128}
            priority
            unoptimized
            className="h-7 w-auto"
          />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
