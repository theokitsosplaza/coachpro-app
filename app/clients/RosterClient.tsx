"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Archive, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { archiveClient, restoreClient, deleteClient } from "./actions";

type RosterEntry = {
  id: string;
  name: string;
  goal: string;
  currentPhase: string;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  email: string | null;
  archivedAt: Date | null;
};

// Presentation-only helper: derives avatar initials from the existing `name`
// field (same pattern as the dashboard/sidebar). It invents no data.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RosterClient({
  roster,
  view,
}: {
  roster: RosterEntry[];
  view: "active" | "archived";
}) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = query.trim()
    ? roster.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false)
        );
      })
    : roster;

  function handleArchive(id: string) {
    setActingId(id);
    startTransition(async () => {
      await archiveClient(id);
      setActingId(null);
    });
  }

  function handleRestore(id: string) {
    setActingId(id);
    startTransition(async () => {
      await restoreClient(id);
      setActingId(null);
    });
  }

  function handleDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setActingId(id);
    startTransition(async () => {
      await deleteClient(id);
      setActingId(null);
    });
  }

  const isArchived = view === "archived";

  // Small shared class fragments so the chip / outline-button shapes stay
  // identical across active and archived rows.
  const chipBase =
    "rounded-lg px-[11px] py-1.5 font-mono text-xs font-semibold";
  const outlineBtn =
    "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-hair-2 bg-transparent px-3 py-2 text-[12.5px] font-semibold transition-colors " +
    "disabled:cursor-not-allowed disabled:opacity-40 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring";

  return (
    <div>
      {/* Active / Archived tabs — underline style. Links preserve the real
          navigation (?view=archived drives the server component). */}
      <div className="mb-5 flex gap-6 border-b border-hair">
        <Link
          href="/clients"
          className={cn(
            "-mb-px rounded-t-sm border-b-2 px-0.5 pb-3 text-sm font-bold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
            view === "active"
              ? "border-accent text-text"
              : "border-transparent text-muted-1 hover:text-text"
          )}
        >
          Active
        </Link>
        <Link
          href="/clients?view=archived"
          className={cn(
            "-mb-px rounded-t-sm border-b-2 px-0.5 pb-3 text-sm font-bold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
            view === "archived"
              ? "border-accent text-text"
              : "border-transparent text-muted-1 hover:text-text"
          )}
        >
          Archived
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-3"
          strokeWidth={2}
        />
        <input
          type="search"
          placeholder={
            view === "active"
              ? "Search clients by name or email…"
              : "Search archived clients…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "h-12 w-full rounded-xl border border-hair-2 bg-surface-deep pl-11 pr-4 text-sm text-text",
            "placeholder:text-muted-3",
            "transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
          )}
        />
      </div>

      {/* Roster */}
      <div className="flex flex-col gap-3">
        {filtered.map((client) => (
          <div
            key={client.id}
            className={cn(
              "flex items-center gap-4 rounded-2xl border px-[22px] py-[18px] transition-colors",
              isArchived
                ? "border-hair bg-surface-deep opacity-[0.86]"
                : "border-hair bg-surface hover:border-[color-mix(in_oklab,var(--accent)_45%,transparent)] hover:bg-surface-2"
            )}
          >
            {/* Content is the navigation target (opens the client profile).
                Kept as its own Link so the archive/restore/delete buttons —
                which fire server actions, not navigation — stay outside it. */}
            <Link
              href={`/clients/${client.id}`}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-[18px] rounded-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                actingId === client.id && "pointer-events-none opacity-50"
              )}
            >
              {/* Neutral avatar (initials derived from name) */}
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
                  isArchived ? "bg-white/[0.04] text-muted-1" : "bg-white/5 text-nav"
                )}
              >
                {initialsOf(client.name)}
              </div>

              {/* Name + goal / phase */}
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate font-display text-base font-bold",
                    isArchived ? "text-muted-1" : "text-text"
                  )}
                >
                  {client.name}
                </div>
                <div
                  className={cn(
                    "mt-1 text-[12.5px]",
                    isArchived ? "text-muted-2" : "text-muted-1"
                  )}
                >
                  Goal{" "}
                  <b className={cn("font-bold", isArchived ? "text-muted-1" : "text-text")}>
                    {client.goal}
                  </b>
                  <span className="px-2 text-muted-3">·</span>
                  Phase{" "}
                  <b className={cn("font-bold", isArchived ? "text-muted-1" : "text-text")}>
                    {client.currentPhase}
                  </b>
                </div>
              </div>

              {/* Macro chips */}
              <div className="flex shrink-0 gap-2">
                {isArchived ? (
                  <>
                    <span className={cn(chipBase, "bg-white/5 text-muted-1")}>
                      {client.targetProtein}P
                    </span>
                    <span className={cn(chipBase, "bg-white/5 text-muted-1")}>
                      {client.targetCarbs}C
                    </span>
                    <span className={cn(chipBase, "bg-white/5 text-muted-1")}>
                      {client.targetFats}F
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        chipBase,
                        "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent-lite"
                      )}
                    >
                      {client.targetProtein}P
                    </span>
                    <span
                      className={cn(
                        chipBase,
                        "bg-[color-mix(in_oklab,var(--green)_14%,transparent)] text-green"
                      )}
                    >
                      {client.targetCarbs}C
                    </span>
                    <span
                      className={cn(
                        chipBase,
                        "bg-[color-mix(in_oklab,var(--amber)_14%,transparent)] text-amber"
                      )}
                    >
                      {client.targetFats}F
                    </span>
                  </>
                )}
              </div>
            </Link>

            {/* Action buttons — fire server actions, kept as siblings of the Link */}
            {view === "active" ? (
              <button
                type="button"
                onClick={() => handleArchive(client.id)}
                disabled={isPending && actingId === client.id}
                title="Archive client"
                className={cn(
                  outlineBtn,
                  "text-muted-1 hover:border-white/20 hover:text-text"
                )}
              >
                <Archive className="h-3.5 w-3.5" strokeWidth={1.9} />
                Archive
              </button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(client.id)}
                  disabled={isPending && actingId === client.id}
                  title="Restore client"
                  className={cn(
                    outlineBtn,
                    "text-accent-lite hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                  )}
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPendingDelete({ id: client.id, name: client.name })
                  }
                  disabled={isPending && actingId === client.id}
                  title="Permanently delete client"
                  className={cn(
                    outlineBtn,
                    "text-muted-1 hover:border-[color-mix(in_oklab,var(--red)_40%,transparent)] hover:text-red"
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty states */}
        {roster.length === 0 && view === "active" && (
          <div className="rounded-2xl border border-dashed border-hair-2 bg-surface/40 py-12 text-center">
            <p className="text-sm font-bold text-text">No clients yet</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-muted-1">
              Add your first client to start tracking check-ins and building plans.
            </p>
          </div>
        )}

        {roster.length === 0 && view === "archived" && (
          <div className="rounded-2xl border border-hair bg-surface py-10 text-center text-[13px] text-muted-1">
            No archived clients.
          </div>
        )}

        {roster.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-hair bg-surface py-10 text-center text-[13px] text-muted-1">
            No clients match your search.
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[color-mix(in_oklab,var(--red)_30%,transparent)] bg-surface p-6 shadow-[var(--shadow-pop)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--red)_14%,transparent)]">
                <AlertTriangle className="h-5 w-5 text-red" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-text">
                  Permanently delete client?
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-1">
                  This permanently deletes{" "}
                  <span className="font-bold text-text">
                    {pendingDelete.name}
                  </span>{" "}
                  and all their check-ins and history. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Permanently delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
