"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { updateCoachCheckIn, deleteCoachCheckIn } from "./actions";
import type { CheckInFormErrors } from "@/lib/check-in-validation";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CheckInValues = {
  id: string
  date: Date
  weight: number
  loggedProtein: number
  loggedCarbs: number
  loggedFats: number
  sleepScore: number
  fatigueScore: number
  cycleAffected: boolean
  clientReflection: string
  changeNote: string | null
}

type Props = {
  clientId: string
  clientName: string
  checkIn: CheckInValues
  wasApproved: boolean
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
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function CheckInEditForm({ clientId, clientName, checkIn, wasApproved }: Props) {
  const boundAction = updateCoachCheckIn.bind(null, clientId, checkIn.id);
  const [errors, action, isPending] = useActionState<CheckInFormErrors, FormData>(
    boundAction,
    {},
  );

  // Delete is its own form (forms cannot nest) with a two-step inline confirm:
  // first click reveals the card naming the check-in's date; only the explicit
  // second click submits the destructive action.
  const boundDelete = deleteCoachCheckIn.bind(null, clientId, checkIn.id);
  const [deleteErrors, deleteAction, isDeleting] = useActionState<CheckInFormErrors, FormData>(
    boundDelete,
    {},
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const formattedDate = new Date(checkIn.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Guard against accidentally wiping a reflection that existed when the form
  // loaded (select-all-delete → save). The client's own words are the core AI
  // signal, so clearing them must be deliberate — confirmed, not silent.
  // React only invokes the form's action when the submit event isn't
  // defaultPrevented, so preventDefault() here cancels the save outright.
  // No friction when the field started empty (the normal backfill flow).
  const hadReflection = checkIn.clientReflection.trim().length > 0
  const confirmReflectionClear = (e: React.FormEvent<HTMLFormElement>) => {
    if (!hadReflection) return
    const submitted =
      ((new FormData(e.currentTarget).get('clientReflection') as string | null) ?? '').trim()
    if (submitted.length === 0 && !window.confirm(
      "This check-in has a written reflection from the client. Save without it?\n\n" +
      "Their words will be permanently removed and the AI loses this week's qualitative signal.",
    )) {
      e.preventDefault()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-1">{clientName}</p>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-text">Edit check-in</h1>
          <p className="mt-2.5 text-sm text-muted-2">
            Correcting submission from <span className="font-medium text-text">{formattedDate}</span>
          </p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="shrink-0 text-sm text-muted-2 hover:text-text transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      {wasApproved && (
        <div className="mb-5 rounded-[10px] border border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] px-4 py-3 text-sm text-amber">
          This check-in was already approved. Saving will reset it to <strong>Pending</strong> and clear the AI synthesis so you can re-run it.
        </div>
      )}

      <form action={action} onSubmit={confirmReflectionClear} noValidate className="space-y-5">
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
              Changing the date re-orders this client&apos;s history and re-runs the analysis.
            </p>
          </div>
          <div className="max-w-[180px]">
            <label htmlFor="date" className="block text-sm font-medium text-text mb-1.5">
              Date <span className="text-red">*</span>
            </label>
            <input
              id="date" name="date" type="date"
              min="2020-01-01" max={toDayInputValue(new Date())}
              defaultValue={toDayInputValue(checkIn.date)}
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
              defaultValue={checkIn.weight}
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
              { id: "loggedProtein", label: "Protein (g)", defaultVal: checkIn.loggedProtein, error: errors.loggedProtein },
              { id: "loggedCarbs",   label: "Carbs (g)",   defaultVal: checkIn.loggedCarbs,   error: errors.loggedCarbs },
              { id: "loggedFats",    label: "Fats (g)",    defaultVal: checkIn.loggedFats,     error: errors.loggedFats },
            ].map(({ id, label, defaultVal, error }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-text mb-1.5">
                  {label} <span className="text-red">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0" max="1000"
                  placeholder="0"
                  defaultValue={defaultVal}
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
                defaultValue={checkIn.sleepScore}
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
                defaultValue={checkIn.fatigueScore}
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
              defaultValue={checkIn.clientReflection}
              disabled={isPending}
              className={cn(textareaBase, "border-hair-2", errors.clientReflection && "border-red focus:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.clientReflection} />
          </div>
        </div>

        {/* ── Change this week (optional — open when a note exists so it is
            never hidden behind a closed control) ─────────────────── */}
        <details
          className="group rounded-2xl border border-hair bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          open={!!checkIn.changeNote?.trim() || undefined}
        >
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
              defaultValue={checkIn.changeNote ?? ""}
              disabled={isPending}
              className={cn(textareaBase, "border-hair-2", errors.changeNote && "border-red focus:ring-[color-mix(in_oklab,var(--red)_30%,transparent)]")}
            />
            <FieldError msg={errors.changeNote} />
          </div>
        </details>

        {/* ── Cycle flag ────────────────────────────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hair bg-surface px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-white/[0.02]">
          <input
            type="checkbox"
            name="cycleAffected"
            value="on"
            defaultChecked={checkIn.cycleAffected}
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

        {/* ── Submit ────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isPending}
          className={buttonClass({ size: "lg", className: "w-full" })}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving changes…</>
          ) : (
            "Save changes"
          )}
        </button>
      </form>

      {/* ── Danger zone: delete (own form — forms cannot nest) ── */}
      <div className="mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {!confirmingDelete ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text">Delete this check-in</p>
              <p className="mt-0.5 text-xs text-muted-2">
                Permanently removes the {formattedDate} check-in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending || isDeleting}
              className={buttonClass({ variant: "danger", size: "md" })}
            >
              Delete check-in…
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red">
              Delete the check-in from {formattedDate}?
            </p>
            <p className="text-sm text-muted-2">
              This permanently removes its numbers, the client&apos;s written
              reflection, and its AI analysis. This cannot be undone.
            </p>
            {wasApproved && (
              <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--amber)_28%,transparent)] bg-[color-mix(in_oklab,var(--amber)_11%,transparent)] px-4 py-3 text-sm text-amber">
                This check-in was approved — the client&apos;s current macro targets
                may have been set from its analysis. Deleting it will NOT revert
                those targets or the macro history.
              </div>
            )}
            {deleteErrors._form && (
              <div className="rounded-[10px] border border-[color-mix(in_oklab,var(--red)_26%,transparent)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] px-4 py-3 text-sm text-red">
                {deleteErrors._form}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <form action={deleteAction}>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className={buttonClass({ variant: "danger", size: "md" })}
                >
                  {isDeleting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                  ) : (
                    "Yes, delete it"
                  )}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className={buttonClass({ variant: "secondary", size: "md" })}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
