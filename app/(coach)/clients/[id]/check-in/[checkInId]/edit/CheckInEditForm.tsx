"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
}

type Props = {
  clientId: string
  clientName: string
  checkIn: CheckInValues
  wasApproved: boolean
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

const textareaBase =
  "w-full rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground " +
  "placeholder:text-muted-foreground/50 transition-colors resize-y min-h-[140px] " +
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent " +
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
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{clientName}</p>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em] text-foreground">Edit check-in</h1>
          <p className="mt-2.5 text-sm text-muted-foreground">
            Correcting submission from <span className="font-medium text-foreground">{formattedDate}</span>
          </p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      {wasApproved && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-muted px-4 py-3 text-sm text-warning">
          This check-in was already approved. Saving will reset it to <strong>Pending</strong> and clear the AI synthesis so you can re-run it.
        </div>
      )}

      <form action={action} onSubmit={confirmReflectionClear} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-lg border border-anomaly/30 bg-anomaly/10 px-4 py-3 text-sm text-anomaly">
            {errors._form}
          </div>
        )}

        {/* ── Check-in date ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Check-in date
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Changing the date re-orders this client&apos;s history and re-runs the analysis.
            </p>
          </div>
          <div className="max-w-[220px]">
            <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1.5">
              Date <span className="text-anomaly">*</span>
            </label>
            <input
              id="date" name="date" type="date"
              min="2020-01-01" max={toDayInputValue(new Date())}
              defaultValue={toDayInputValue(checkIn.date)}
              disabled={isPending}
              className={cn(inputBase, "border-border", errors.date && "border-anomaly focus:ring-anomaly/30")}
            />
            <FieldError msg={errors.date} />
          </div>
        </div>

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
              defaultValue={checkIn.weight}
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
              { id: "loggedProtein", label: "Protein (g)", defaultVal: checkIn.loggedProtein, error: errors.loggedProtein },
              { id: "loggedCarbs",   label: "Carbs (g)",   defaultVal: checkIn.loggedCarbs,   error: errors.loggedCarbs },
              { id: "loggedFats",    label: "Fats (g)",    defaultVal: checkIn.loggedFats,     error: errors.loggedFats },
            ].map(({ id, label, defaultVal, error }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
                  {label} <span className="text-anomaly">*</span>
                </label>
                <input
                  id={id} name={id} type="number" min="0" max="1000"
                  placeholder="0"
                  defaultValue={defaultVal}
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
                defaultValue={checkIn.sleepScore}
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
                defaultValue={checkIn.fatigueScore}
                disabled={isPending}
                className={cn(inputBase, "border-border", errors.fatigueScore && "border-anomaly focus:ring-anomaly/30")}
              />
              <p className="mt-1 text-xs text-muted-foreground">1 = fresh · 10 = exhausted</p>
              <FieldError msg={errors.fatigueScore} />
            </div>
          </div>
        </div>

        {/* ── Client's reflection (optional transcription) ──────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Client&apos;s reflection
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The AI reads this for tone and attention signals. Leave blank if the
              client gave no reflection — don&apos;t write one for them.
            </p>
          </div>
          <div>
            <label htmlFor="clientReflection" className="block text-sm font-medium text-foreground mb-1.5">
              Paste or transcribe their own words{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="clientReflection" name="clientReflection" rows={6}
              placeholder="e.g. their WhatsApp message or what they told you in person — in their words, not yours."
              defaultValue={checkIn.clientReflection}
              disabled={isPending}
              className={cn(textareaBase, "border-border", errors.clientReflection && "border-anomaly focus:ring-anomaly/30")}
            />
            <FieldError msg={errors.clientReflection} />
          </div>
        </div>

        {/* ── Cycle flag ────────────────────────────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/20">
          <input
            type="checkbox"
            name="cycleAffected"
            value="on"
            defaultChecked={checkIn.cycleAffected}
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving changes…</>
          ) : (
            "Save changes"
          )}
        </button>
      </form>

      {/* ── Danger zone: delete (own form — forms cannot nest) ── */}
      <div className="mt-8 rounded-xl border border-anomaly/25 bg-card p-6">
        {!confirmingDelete ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Delete this check-in</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
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
            <p className="text-sm font-semibold text-anomaly">
              Delete the check-in from {formattedDate}?
            </p>
            <p className="text-xs text-muted-foreground">
              This permanently removes its numbers, the client&apos;s written
              reflection, and its AI analysis. This cannot be undone.
            </p>
            {wasApproved && (
              <p className="text-xs text-warning">
                This check-in was approved — the client&apos;s current macro targets
                may have been set from its analysis. Deleting it will NOT revert
                those targets or the macro history.
              </p>
            )}
            {deleteErrors._form && (
              <p className="text-xs text-anomaly">{deleteErrors._form}</p>
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
