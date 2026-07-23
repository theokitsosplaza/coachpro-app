"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
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
  // False ONLY when the questionnaire explicitly answers Sex = Male; the
  // absent/unfilled default is true so pre-questionnaire clients see the
  // control exactly as before.
  showCycleFlag: boolean
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red">{msg}</p>;
}

const inputBase =
  "h-11 w-full rounded-[10px] border bg-bg px-3.5 text-sm text-text " +
  "placeholder:text-muted-3 transition-colors hover:border-white/20 " +
  "focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring " +
  "disabled:opacity-50";

const textareaBase =
  "w-full resize-y rounded-[10px] border bg-bg px-3.5 py-3 text-[13.5px] leading-[1.6] text-text " +
  "placeholder:text-muted-3 transition-colors min-h-[140px] " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring " +
  "disabled:opacity-50";

/** Local-time "YYYY-MM-DD" — matches the server-side calendar-day validation. */
function toDayInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckInForm({ clientId, clientName, lastCheckIn, showCycleFlag }: Props) {
  const boundAction = createCheckIn.bind(null, clientId);
  const [errors, action, isPending] = useActionState<CheckInFormErrors, FormData>(
    boundAction,
    {},
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">{clientName}</p>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-text">New check-in</h1>
          {lastCheckIn && (
            <p className="mt-2.5 text-sm text-muted-2">
              Pre-filled from last check-in — change what&apos;s different this week.
            </p>
          )}
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="shrink-0 text-sm text-muted-2 hover:text-text transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      <form action={action} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] px-4 py-3 text-sm text-red">
            {errors._form}
          </div>
        )}

        {/* ── Check-in date ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Check-in date
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
              Defaults to today — pick a past date when logging an earlier week
              (e.g. entering a client&apos;s history).
            </p>
          </div>
          <div className="max-w-[180px]">
            <label htmlFor="date" className="block text-sm font-medium text-text mb-1.5">
              Date <span className="text-red">*</span>
            </label>
            <input
              id="date" name="date" type="date"
              min="2020-01-01" max={toDayInputValue(new Date())}
              defaultValue={toDayInputValue(new Date())}
              disabled={isPending}
              className={cn(inputBase, "border-hair-2", errors.date && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.date} />
          </div>
        </div>

        {/* ── Body Metrics ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
            Body metrics
          </h2>
          <div className="max-w-[180px]">
            <label htmlFor="weight" className="block text-sm font-medium text-text mb-1.5">
              Weight (kg) <span className="text-red">*</span>
            </label>
            <input
              id="weight" name="weight" type="number" step="0.1" min="30" max="300"
              placeholder="e.g. 72.4"
              defaultValue={lastCheckIn?.weight ?? ""}
              disabled={isPending}
              className={cn(inputBase, "border-hair-2", errors.weight && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.weight} />
          </div>
        </div>

        {/* ── Nutrition Log ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Nutrition log
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
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
                <label htmlFor={id} className="block text-sm font-medium text-text mb-1.5">
                  {label} <span className="text-red">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0" max="1000"
                  placeholder="0"
                  defaultValue={defaultVal ?? ""}
                  disabled={isPending}
                  className={cn(inputBase, "border-hair-2", error && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
                />
                <FieldError msg={error} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Wellbeing ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Wellbeing
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
              Rate on a 1–10 scale for this week.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sleepScore" className="block text-sm font-medium text-text mb-1.5">
                Sleep Quality <span className="text-red">*</span>
              </label>
              <input
                id="sleepScore" name="sleepScore" type="number" min="1" max="10" step="1"
                placeholder="1–10"
                defaultValue={lastCheckIn?.sleepScore ?? ""}
                disabled={isPending}
                className={cn(inputBase, "border-hair-2", errors.sleepScore && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
              />
              <p className="mt-1 text-xs text-muted-2">1 = terrible · 10 = perfect</p>
              <FieldError msg={errors.sleepScore} />
            </div>
            <div>
              <label htmlFor="fatigueScore" className="block text-sm font-medium text-text mb-1.5">
                Fatigue Level <span className="text-red">*</span>
              </label>
              <input
                id="fatigueScore" name="fatigueScore" type="number" min="1" max="10" step="1"
                placeholder="1–10"
                defaultValue={lastCheckIn?.fatigueScore ?? ""}
                disabled={isPending}
                className={cn(inputBase, "border-hair-2", errors.fatigueScore && "border-red focus-visible:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
              />
              <p className="mt-1 text-xs text-muted-2">1 = fresh · 10 = exhausted</p>
              <FieldError msg={errors.fatigueScore} />
            </div>
          </div>
        </div>

        {/* ── Client's reflection (optional transcription) ──────── */}
        <div className="rounded-2xl border border-hair bg-surface p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">
              Client&apos;s reflection
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
              The AI reads this for tone and attention signals. Leave blank if the
              client gave no reflection — don&apos;t write one for them.
            </p>
          </div>
          <div>
            <label htmlFor="clientReflection" className="block text-sm font-medium text-text mb-1.5">
              Paste or transcribe their own words{" "}
              <span className="font-normal text-muted-3">(optional)</span>
            </label>
            <textarea
              id="clientReflection" name="clientReflection" rows={6}
              placeholder="e.g. their WhatsApp message or what they told you in person — in their words, not yours."
              disabled={isPending}
              className={cn(textareaBase, "border-hair-2", errors.clientReflection && "border-red focus:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.clientReflection} />
          </div>
        </div>

        {/* ── Change this week (optional — collapsed, zero friction) ── */}
        <details className="group rounded-2xl border border-hair bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-medium text-muted-2 group-open:text-text transition-colors">
              Did anything change this week?{" "}
              <span className="text-muted-3">(optional)</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-2 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-hair px-6 pb-6 pt-4">
            <p className="mb-3 text-xs text-muted-2">
              New job, injury, holiday, stopped a supplement — anything in the
              client&apos;s situation the AI should treat as this week&apos;s context.
              Never shown to the client.
            </p>
            <textarea
              id="changeNote" name="changeNote" rows={3} maxLength={500}
              placeholder="e.g. Started a new warehouse job — on his feet 10 hours a day. Stopped creatine."
              disabled={isPending}
              className={cn(textareaBase, "border-hair-2", errors.changeNote && "border-red focus:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.changeNote} />
          </div>
        </details>

        {/* ── Cycle flag (hidden only when Sex is explicitly Male) ── */}
        {showCycleFlag && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hair bg-surface px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-white/[0.02]">
            <input
              type="checkbox"
              name="cycleAffected"
              value="on"
              disabled={isPending}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium text-text">
                Weight may be affected by menstrual cycle this week
              </p>
              <p className="mt-0.5 text-xs text-muted-2">
                Suppresses weight-based verdicts for this check-in. Other signals (adherence, fatigue) still report normally.
              </p>
            </div>
          </label>
        )}

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
