'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const inputBase =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
  'disabled:opacity-50'

function PortalLoginForm() {
  const searchParams = useSearchParams()
  const invalidLink  = searchParams.get('error') === 'invalid_link'

  const [email, setEmail]       = useState('')
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm`,
      },
    })

    setIsPending(false)

    if (error) {
      setError(error.message)
      return
    }

    setSent(true)
  }

  // ── Sent confirmation ─────────────────────────────────────────────────────

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-6 w-6 text-success" strokeWidth={2} />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a login link to{' '}
            <span className="font-medium text-foreground">{email}</span>.
            <br />
            The link expires in 1 hour.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </main>
    )
  }

  // ── Login form ────────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2">
            <Mail className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Client Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email — we&apos;ll send you a login link
          </p>
        </div>

        {/* Invalid-link banner (from callback error redirect) */}
        {invalidLink && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2.5 text-sm text-warning">
            Your login link has expired or is invalid. Request a new one below.
          </div>
        )}

        {/* Form card */}
        <div
          className="rounded-2xl border border-border-strong bg-surface-2 p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBase}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-status-red-soft px-3 py-2 text-sm text-status-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                'bg-accent text-sm font-semibold text-accent-foreground',
                'transition-opacity hover:opacity-90 active:opacity-80',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? 'Sending…' : 'Send login link'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is by invite only. Contact your coach if you need help.
        </p>

      </div>
    </main>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginForm />
    </Suspense>
  )
}
