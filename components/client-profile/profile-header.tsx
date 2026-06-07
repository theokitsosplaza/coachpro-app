"use client";

import { useState } from "react";
import {
  MessageSquare,
  SlidersHorizontal,
  Scale,
  UserCircle,
} from "lucide-react";
import type { ClientProfile } from "@/lib/client-profile-data";
import { RosterStatusBadge } from "@/components/roster-status-badge";
import { ClientBioSheet } from "@/components/client-profile/client-bio-sheet";
import { cn } from "@/lib/utils";

type ProfileHeaderProps = {
  profile: ClientProfile;
  onAdjustPlan?: () => void;
  onMessageClient?: () => void;
};

export function ProfileHeader({
  profile,
  onAdjustPlan,
  onMessageClient,
}: ProfileHeaderProps) {
  const [bioOpen, setBioOpen] = useState(false);
  const hasBio = Boolean(profile.bio);

  return (
    <>
      <header className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-muted text-xl font-semibold text-accent">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {profile.name}
                </h1>
                <RosterStatusBadge status={profile.status} />
              </div>
              <p className="mt-1 text-base font-medium text-foreground/90">
                {profile.phase}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                <Scale className="h-4 w-4 text-accent" strokeWidth={2} />
                <span className="text-sm text-muted-foreground">Current weight</span>
                <span className="text-sm font-semibold text-foreground">
                  {profile.currentWeightKg} kg
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {hasBio && (
              <button
                type="button"
                onClick={() => setBioOpen(true)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 text-sm font-semibold text-foreground",
                  "transition-colors hover:border-accent/40 hover:bg-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <UserCircle className="h-4 w-4" strokeWidth={2} />
                View Client Bio
              </button>
            )}
            <button
              type="button"
              onClick={onAdjustPlan}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground",
                "transition-colors hover:border-accent/40 hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
              Adjust Plan
            </button>
            <button
              type="button"
              onClick={onMessageClient}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground",
                "shadow-sm shadow-accent/20 transition-colors hover:bg-accent/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={2} />
              Message Client
            </button>
          </div>
        </div>
      </header>

      {profile.bio && (
        <ClientBioSheet
          open={bioOpen}
          onOpenChange={setBioOpen}
          clientName={profile.name}
          bio={profile.bio}
        />
      )}
    </>
  );
}
