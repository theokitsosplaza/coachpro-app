'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const inputBase =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ' +
  'disabled:opacity-50'

function PortalLoginForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const invalidLink  = searchParams.get('error') === 'invalid_link'

  const [email, setEmail]         = useState('')
  const [code, setCode]           = useState('')
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Step 1: send the 6-digit code to the client's email.
  async function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createClient()
    // No emailRedirectTo → Supabase emails a 6-digit code instead of a magic link.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    setIsPending(false)

    if (error) {
      setError(error.message)
      return
    }

    setSent(true)
  }

  // Step 2: verify the code the client typed in.
  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setIsPending(false)
      setError(error.message)
      return
    }

    // Success — session is established; go to the portal.
    router.replace('/portal')
  }

  // ── Code entry screen ──────────────────────────────────────────────────────

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm">

          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2">
              <Mail className="h-5 w-5 text-foreground" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Enter your code
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {/* Code form card */}
          <div
            className="rounded-2xl border border-border-strong bg-surface-2 p-6"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  6-digit code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={cn(inputBase, 'text-center text-lg tracking-[0.5em]')}
                  autoFocus
                />
              </div>

              {error && (
                <p className="rounded-lg bg-status-red-soft px-3 py-2 text-sm text-status-red">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending || code.length !== 6}
                className={cn(
                  'mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                  'bg-accent text-sm font-semibold text-accent-foreground',
                  'transition-opacity hover:opacity-90 active:opacity-80',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Verifying…' : 'Verify & sign in'}
              </button>
            </form>
          </div>

          <button
            onClick={() => {
              setSent(false)
              setCode('')
              setError(null)
            }}
            className="mt-6 block w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Use a different email
          </button>

        </div>
      </main>
    )
  }

  // ── Email entry screen ─────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2">
            <Mail className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            VitaeForce
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email — we&apos;ll send you a sign-in code
          </p>
        </div>

        {/* Invalid-link banner (from callback error redirect) */}
        {invalidLink && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2.5 text-sm text-warning">
            Your sign-in link has expired or is invalid. Request a new code below.
          </div>
        )}

        {/* Form card */}
        <div
          className="rounded-2xl border border-border-strong bg-surface-2 p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <form onSubmit={handleSendCode} className="space-y-4">
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
              {isPending ? 'Sending…' : 'Send sign-in code'}
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
