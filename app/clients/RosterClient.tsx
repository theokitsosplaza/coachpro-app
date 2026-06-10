"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Archive, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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
              <div className="p-6 border border-gray-800 bg-black/50 rounded-xl shadow-sm hover:border-gray-600 hover:bg-gray-900 transition-all cursor-pointer h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{client.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Goal: <span className="text-white">{client.goal}</span> | Phase:{" "}
                      <span className="text-white">{client.currentPhase}</span>
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm font-medium">
                    <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full border border-blue-800">
                      {client.targetProtein}g Protein
                    </span>
                    <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full border border-green-800">
                      {client.targetCarbs}g Carbs
                    </span>
                    <span className="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full border border-yellow-800">
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
          <div className="text-gray-500 text-center py-10">
            No clients found. Time to sign some up!
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
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-9 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={cn(
                  "h-9 rounded-lg border border-anomaly/50 bg-anomaly-muted px-4 text-xs font-bold text-anomaly",
                  "hover:bg-anomaly-muted/80 transition-colors"
                )}
              >
                Permanently delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
