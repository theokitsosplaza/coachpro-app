import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { verifyCoachSession } from '@/lib/dal'
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Master Roster</h1>
        {view === 'active' && (
          <Link
            href="/clients/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add Client
          </Link>
        )}
      </div>

      <RosterClient roster={roster} view={view} />
    </div>
  )
}
