import { Lock } from 'lucide-react'

export default function PortalSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Portal access suspended
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your access to this portal has been suspended.
          <br />
          Please contact your coach for more information.
        </p>
      </div>
    </main>
  )
}
