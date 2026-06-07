"use client";

import type { ReactNode } from "react";
import {
  Briefcase,
  Activity,
  AlertCircle,
  Calendar,
  Ruler,
  User,
  Scale,
} from "lucide-react";
import type { ClientBio } from "@/lib/client-profile-data";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ClientBioSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  bio: ClientBio;
};

function BioField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: typeof User;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-muted/20 p-4 transition-colors hover:border-border",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export function ClientBioSheet({
  open,
  onOpenChange,
  clientName,
  bio,
}: ClientBioSheetProps) {
  const { startingMetrics: start } = bio;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Client bio — deep dive</SheetTitle>
          <SheetDescription>
            Context for {clientName}. Glance view stays on the command center.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-6 pb-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <BioField label="Age" icon={User}>
              {bio.age} years
            </BioField>
            <BioField label="Height" icon={Ruler}>
              {bio.heightCm} cm
            </BioField>
          </div>

          <BioField label="Occupation" icon={Briefcase}>
            {bio.occupation}
          </BioField>

          <BioField label="Activity level" icon={Activity}>
            {bio.activityLevel}
          </BioField>

          <BioField label="Injury history" icon={AlertCircle}>
            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
              {bio.injuryHistory.map((item) => (
                <li key={item} className="text-foreground/90">
                  {item}
                </li>
              ))}
            </ul>
          </BioField>

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
              Starting metrics
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Baseline · {start.startDate}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Weight
                </dt>
                <dd className="mt-0.5 flex items-center gap-1 text-sm font-semibold">
                  <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                  {start.weightKg} kg
                </dd>
              </div>
              {start.bodyFatPercent != null && (
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Body fat
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {start.bodyFatPercent}%
                  </dd>
                </div>
              )}
              {start.waistCm != null && (
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Waist
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">{start.waistCm} cm</dd>
                </div>
              )}
            </dl>
            {start.notes && (
              <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                {start.notes}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
