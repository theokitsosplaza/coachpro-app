"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createCheckIn } from "../actions";
import type { CheckInFormErrors } from "@/lib/check-in-validation";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LastCheckIn = {
  weight: number
  loggedProtein: number
  loggedCarbs: number
  loggedFats: number
  sleepScore: number
  fatigueScore: number
} | null

type Props = {
  clientId: string
  clientName: string
  lastCheckIn: LastCheckIn
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-anomaly">{msg}</p>;
}

const inputBase =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent " +
  "disabled:opacity-50";

export function CheckInForm({ clientId, clientName, lastCheckIn }: Props) {
  const boundAction = createCheckIn.bind(null, clientId);
  const [errors, action, isPending] = useActionState<CheckInFormErrors, FormData>(
    boundAction,
    {},
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{clientName}</p>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-foreground">New check-in</h1>
          {lastCheckIn && (
            <p className="mt-2.5 text-sm text-muted-foreground">
              Pre-filled from last check-in — change what&apos;s different this week.
            </p>
          )}
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      <form action={action} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-lg border border-anomaly/30 bg-anomaly/10 px-4 py-3 text-sm text-anomaly">
            {errors._form}
          </div>
        )}

        {/* ── Body Metrics ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Body metrics
          </h2>
          <div className="max-w-[180px]">
            <label htmlFor="weight" className="block text-sm font-medium text-foreground mb-1.5">
              Weight (kg) <span className="text-anomaly">*</span>
            </label>
            <input
              id="weight" name="weight" type="number" step="0.1" min="30" max="300"
              placeholder="e.g. 72.4"
              defaultValue={lastCheckIn?.weight ?? ""}
              disabled={isPending}
              className={cn(inputBase, "border-border", errors.weight && "border-anomaly focus:ring-anomaly/30")}
            />
            <FieldError msg={errors.weight} />
          </div>
        </div>

        {/* ── Nutrition Log ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Nutrition log
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This week&apos;s average daily intake.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "loggedProtein", label: "Protein (g)", defaultVal: lastCheckIn?.loggedProtein, error: errors.loggedProtein },
              { id: "loggedCarbs",   label: "Carbs (g)",   defaultVal: lastCheckIn?.loggedCarbs,   error: errors.loggedCarbs },
              { id: "loggedFats",    label: "Fats (g)",    defaultVal: lastCheckIn?.loggedFats,     error: errors.loggedFats },
            ].map(({ id, label, defaultVal, error }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
                  {label} <span className="text-anomaly">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0" max="1000"
                  placeholder="0"
                  defaultValue={defaultVal ?? ""}
                  disabled={isPending}
                  className={cn(inputBase, "border-border", error && "border-anomaly focus:ring-anomaly/30")}
                />
                <FieldError msg={error} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Wellbeing ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Wellbeing
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Rate on a 1–10 scale for this week.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sleepScore" className="block text-sm font-medium text-foreground mb-1.5">
                Sleep Quality <span className="text-anomaly">*</span>
              </label>
              <input
                id="sleepScore" name="sleepScore" type="number" min="1" max="10" step="1"
                placeholder="1–10"
                defaultValue={lastCheckIn?.sleepScore ?? ""}
                disabled={isPending}
                className={cn(inputBase, "border-border", errors.sleepScore && "border-anomaly focus:ring-anomaly/30")}
              />
              <p className="mt-1 text-xs text-muted-foreground">1 = terrible · 10 = perfect</p>
              <FieldError msg={errors.sleepScore} />
            </div>
            <div>
              <label htmlFor="fatigueScore" className="block text-sm font-medium text-foreground mb-1.5">
                Fatigue Level <span className="text-anomaly">*</span>
              </label>
              <input
                id="fatigueScore" name="fatigueScore" type="number" min="1" max="10" step="1"
                placeholder="1–10"
                defaultValue={lastCheckIn?.fatigueScore ?? ""}
                disabled={isPending}
                className={cn(inputBase, "border-border", errors.fatigueScore && "border-anomaly focus:ring-anomaly/30")}
              />
              <p className="mt-1 text-xs text-muted-foreground">1 = fresh · 10 = exhausted</p>
              <FieldError msg={errors.fatigueScore} />
            </div>
          </div>
        </div>

        {/* ── Cycle flag ────────────────────────────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/20">
          <input
            type="checkbox"
            name="cycleAffected"
            value="on"
            disabled={isPending}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Weight may be affected by menstrual cycle this week
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Suppresses weight-based verdicts for this check-in. Other signals (adherence, fatigue) still report normally.
            </p>
          </div>
        </label>

        {/* ── Submit ────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isPending}
          className={buttonClass({ size: "lg", className: "w-full" })}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving check-in…</>
          ) : (
            "Save check-in"
          )}
        </button>
      </form>
    </div>
  );
}
