import { LogOut } from 'lucide-react'
import { verifyClientSession } from '@/lib/dal'
import { signOutClient } from '@/app/portal/actions'

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const client = await verifyClientSession()

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface-1 px-4 sm:px-6">
        <span className="font-display text-sm font-semibold text-foreground">
          VitaeForce
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{client.name}</span>
          <form action={signOutClient}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
