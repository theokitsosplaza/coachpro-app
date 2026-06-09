'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { updateClientCheckIn } from './actions'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { cn } from '@/lib/utils'

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
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1.5 text-xs text-anomaly">{msg}</p>
}

const inputBase =
  'w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
  'disabled:opacity-50'

export function PortalEditCheckInForm({ checkIn }: { checkIn: CheckInValues }) {
  const boundAction = updateClientCheckIn.bind(null, checkIn.id)
  const [errors, action, isPending] = useActionState<CheckInFormErrors, FormData>(
    boundAction,
    {},
  )

  const formattedDate = new Date(checkIn.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Edit Check-in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Correcting submission from{' '}
            <span className="font-medium text-foreground">{formattedDate}</span>
          </p>
        </div>
        <Link
          href="/portal"
          className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <form action={action} noValidate className="space-y-5">
        {errors._form && (
          <div className="rounded-xl border border-anomaly/30 bg-anomaly-muted px-4 py-3 text-sm text-anomaly">
            {errors._form}
          </div>
        )}

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
              defaultValue={checkIn.weight}
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
              { id: 'loggedProtein', label: 'Protein (g)', defaultVal: checkIn.loggedProtein, error: errors.loggedProtein },
              { id: 'loggedCarbs',   label: 'Carbs (g)',   defaultVal: checkIn.loggedCarbs,   error: errors.loggedCarbs },
              { id: 'loggedFats',    label: 'Fats (g)',    defaultVal: checkIn.loggedFats,     error: errors.loggedFats },
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
                defaultValue={checkIn.sleepScore}
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
                defaultValue={checkIn.fatigueScore}
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
            defaultChecked={checkIn.cycleAffected}
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
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving changes…</>
            ) : (
              'Save Changes'
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
    </div>
  )
}
