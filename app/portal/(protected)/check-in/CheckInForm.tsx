'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { submitClientCheckIn } from './actions'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { cn } from '@/lib/utils'

type LastCheckIn = {
  weight: number
  loggedProtein: number
  loggedCarbs: number
  loggedFats: number
  sleepScore: number
  fatigueScore: number
} | null

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1.5 text-xs text-anomaly">{msg}</p>
}

const inputBase =
  'w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
  'disabled:opacity-50'

const textareaBase =
  'w-full rounded-xl border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground ' +
  'placeholder:text-muted-foreground/50 transition-colors resize-y min-h-[140px] ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
  'disabled:opacity-50'

export function PortalCheckInForm({ lastCheckIn }: { lastCheckIn: LastCheckIn }) {
  const [errors, action, isPending] = useActionState<CheckInFormErrors, FormData>(
    submitClientCheckIn,
    {},
  )

  return (
    <form action={action} noValidate className="space-y-5">
      {errors._form && (
        <div className="rounded-xl border border-anomaly/30 bg-anomaly-muted px-4 py-3 text-sm text-anomaly">
          {errors._form}
        </div>
      )}

      {/* ── Reflection (the core qualitative signal) ──────────────── */}
      <div
        className="rounded-2xl border border-border-strong bg-surface-2 p-5 space-y-3"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <label
            htmlFor="clientReflection"
            className="block font-display text-base font-semibold text-foreground"
          >
            How did this week really go? <span className="text-anomaly">*</span>
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Tell me about your training, nutrition, sleep, energy, and anything in
            life affecting them — in your own words.
          </p>
        </div>
        <textarea
          id="clientReflection"
          name="clientReflection"
          rows={6}
          disabled={isPending}
          placeholder={
            "e.g. Training felt strong — hit all 4 sessions and added 2.5kg on squats. " +
            "Nutrition was tight during the week but I ate out twice on the weekend. " +
            "Sleep was rough Mon–Tue with a work deadline, then recovered. " +
            "Energy good overall, just a bit stressed toward the end of the week."
          }
          className={cn(
            textareaBase,
            'border-border',
            errors.clientReflection && 'border-anomaly focus:ring-anomaly/30',
          )}
        />
        <FieldError msg={errors.clientReflection} />
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-border-strong bg-surface-2 p-5 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Body
        </h2>
        <div className="max-w-[200px]">
          <label htmlFor="weight" className="block text-sm font-medium text-foreground mb-1.5">
            Weight (kg) <span className="text-anomaly">*</span>
          </label>
          <input
            id="weight" name="weight" type="number" step="0.1" min="30" max="300"
            placeholder="e.g. 72.4"
            defaultValue={lastCheckIn?.weight ?? ''}
            disabled={isPending}
            className={cn(inputBase, 'border-border', errors.weight && 'border-anomaly focus:ring-anomaly/30')}
          />
          <FieldError msg={errors.weight} />
        </div>
      </div>

      {/* ── Nutrition ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-border-strong bg-surface-2 p-5 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nutrition
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your average daily intake this week.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'loggedProtein', label: 'Protein (g)', defaultVal: lastCheckIn?.loggedProtein, error: errors.loggedProtein },
            { id: 'loggedCarbs',   label: 'Carbs (g)',   defaultVal: lastCheckIn?.loggedCarbs,   error: errors.loggedCarbs },
            { id: 'loggedFats',    label: 'Fats (g)',    defaultVal: lastCheckIn?.loggedFats,     error: errors.loggedFats },
          ].map(({ id, label, defaultVal, error }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
                {label} <span className="text-anomaly">*</span>
              </label>
              <input
                id={id} name={id} type="number" min="0" max="1000"
                placeholder="0"
                defaultValue={defaultVal ?? ''}
                disabled={isPending}
                className={cn(inputBase, 'border-border', error && 'border-anomaly focus:ring-anomaly/30')}
              />
              <FieldError msg={error} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Wellbeing ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-border-strong bg-surface-2 p-5 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              defaultValue={lastCheckIn?.sleepScore ?? ''}
              disabled={isPending}
              className={cn(inputBase, 'border-border', errors.sleepScore && 'border-anomaly focus:ring-anomaly/30')}
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
              defaultValue={lastCheckIn?.fatigueScore ?? ''}
              disabled={isPending}
              className={cn(inputBase, 'border-border', errors.fatigueScore && 'border-anomaly focus:ring-anomaly/30')}
            />
            <p className="mt-1 text-xs text-muted-foreground">1 = fresh · 10 = exhausted</p>
            <FieldError msg={errors.fatigueScore} />
          </div>
        </div>
      </div>

      {/* ── Cycle flag ────────────────────────────────────────────── */}
      <label
        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border-strong bg-surface-2 px-5 py-4 transition-colors hover:bg-surface-3"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <input
          type="checkbox"
          name="cycleAffected"
          value="on"
          disabled={isPending}
          className="mt-0.5 h-4 w-4 accent-accent"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Weight may be affected by my cycle this week
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tick this if hormonal changes might affect your weight reading.
          </p>
        </div>
      </label>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 rounded-2xl',
            'bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground',
            'shadow-sm shadow-accent/20',
            'transition-all duration-200 ease-out',
            'hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--accent-ring)]',
            'active:bg-accent-press active:translate-y-0 active:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-accent disabled:hover:shadow-sm',
          )}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            'Submit Check-in'
          )}
        </button>
        <Link
          href="/portal"
          className="w-full inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
