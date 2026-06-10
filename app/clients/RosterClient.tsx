"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type RosterEntry = {
  id: string;
  name: string;
  goal: string;
  currentPhase: string;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  email: string | null;
};

export function RosterClient({ roster }: { roster: RosterEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? roster.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false)
        );
      })
    : roster;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          type="search"
          placeholder="Search clients by name or email…"
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
          <Link href={`/clients/${client.id}`} key={client.id} className="block">
            <div className="p-6 border border-gray-800 bg-black/50 rounded-xl shadow-sm hover:border-gray-600 hover:bg-gray-900 transition-all cursor-pointer">
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
        ))}

        {roster.length === 0 && (
          <div className="text-gray-500 text-center py-10">
            No clients found. Time to sign some up!
          </div>
        )}

        {roster.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            No clients match your search.
          </div>
        )}
      </div>
    </div>
  );
}
