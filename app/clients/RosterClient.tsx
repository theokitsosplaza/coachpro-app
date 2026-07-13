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

  return (
    <div>
      {/* Active / Archived tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <Link
          href="/clients"
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            view === "active"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Active
        </Link>
        <Link
          href="/clients?view=archived"
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            view === "archived"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Archived
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
            "h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm text-foreground",
            "placeholder:text-muted-foreground/50",
            "focus:border-accent focus:outline-none focus:ring-1 focus:ring-ring/30",
            "transition-colors"
          )}
        />
      </div>

      {/* Roster */}
      <div className="grid gap-4">
        {filtered.map((client) => (
          <div key={client.id} className="flex items-stretch gap-3">
            {/* Client card — links to profile */}
            <Link
              href={`/clients/${client.id}`}
              className={cn(
                "min-w-0 flex-1 block",
                actingId === client.id && "pointer-events-none opacity-50"
              )}
            >
              <div className="h-full cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-border-strong hover:bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-foreground">{client.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Goal: <span className="text-foreground">{client.goal}</span>
                      <span className="mx-2 text-border">·</span>
                      Phase: <span className="text-foreground">{client.currentPhase}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-macro-protein/20 bg-macro-protein/10 px-2.5 py-1 text-macro-protein">
                      {client.targetProtein}g Protein
                    </span>
                    <span className="rounded-full border border-macro-carbs/20 bg-macro-carbs/10 px-2.5 py-1 text-macro-carbs">
                      {client.targetCarbs}g Carbs
                    </span>
                    <span className="rounded-full border border-macro-fats/20 bg-macro-fats/10 px-2.5 py-1 text-macro-fats">
                      {client.targetFats}g Fats
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Action buttons */}
            {view === "active" ? (
              <button
                type="button"
                onClick={() => handleArchive(client.id)}
                disabled={isPending && actingId === client.id}
                title="Archive client"
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground",
                  "hover:border-warning/40 hover:bg-warning-muted/30 hover:text-warning transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-40"
                )}
              >
                <Archive className="h-3.5 w-3.5" strokeWidth={2} />
                Archive
              </button>
            ) : (
              <div className="shrink-0 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(client.id)}
                  disabled={isPending && actingId === client.id}
                  title="Restore client"
                  className={cn(
                    "flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground",
                    "hover:border-success/40 hover:bg-success-muted/30 hover:text-success transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
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
                    "flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground",
                    "hover:border-anomaly/40 hover:bg-anomaly-muted/30 hover:text-anomaly transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty states */}
        {roster.length === 0 && view === "active" && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">No clients yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Add your first client to start tracking check-ins and building plans.
            </p>
          </div>
        )}

        {roster.length === 0 && view === "archived" && (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            No archived clients.
          </div>
        )}

        {roster.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            No clients match your search.
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-anomaly/30 bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-anomaly-muted">
                <AlertTriangle className="h-5 w-5 text-anomaly" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  Permanently delete client?
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  This permanently deletes{" "}
                  <span className="font-semibold text-foreground">
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
