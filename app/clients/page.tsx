import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { verifyCoachSession } from '@/lib/dal'
import { Sidebar } from '@/components/sidebar'
import { buttonClass } from '@/components/ui/button'
import { RosterClient } from './RosterClient'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const coach = await verifyCoachSession()

  const params = await searchParams
  const view = params.view === 'archived' ? 'archived' : 'active'

  const roster = await prisma.client.findMany({
    where: view === 'archived'
      ? { coachId: coach.id, archivedAt: { not: null } }
      : { coachId: coach.id, archivedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar coachName={coach.name ?? undefined} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Clients
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your full roster and check-in history
              </p>
            </div>
            {view === 'active' && (
              <Link href="/clients/new" className={buttonClass()}>
                <UserPlus className="h-4 w-4" strokeWidth={2} />
                Add Client
              </Link>
            )}
          </div>

          <RosterClient roster={roster} view={view} />
        </div>
      </main>
    </div>
  )
}
