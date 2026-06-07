import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  
  const resolvedParams = await params
  const clientId = resolvedParams.id
  
  // 1. Fetch the client AND pull all their attached workout logs
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      workoutLogs: {
        orderBy: { date: 'desc' } // Shows the newest workouts first!
      }
    }
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      <Link href="/clients" className="text-gray-400 hover:text-white transition-colors mb-8 inline-block">
        &larr; Back to Master Roster
      </Link>

      {/* Hero Section */}
      <div className="bg-black/50 border border-gray-800 p-8 rounded-xl mb-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold text-white">{client.name}</h1>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/clients/${client.id}/check-in/new`}
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              + New Check-in
            </Link>
            <Link
              href={`/clients/${client.id}/edit`}
              className="text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit
            </Link>
          </div>
        </div>
        <p className="text-lg text-gray-400 mb-6">
          Primary Goal: <span className="text-white font-medium">{client.goal}</span> | Current Phase: <span className="text-white font-medium">{client.currentPhase}</span>
        </p>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 px-6 py-4 rounded-lg min-w-[140px]">
            <div className="text-blue-400 text-sm font-semibold mb-1">Protein</div>
            <div className="text-3xl font-bold text-white">{client.targetProtein}g</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 px-6 py-4 rounded-lg min-w-[140px]">
            <div className="text-green-400 text-sm font-semibold mb-1">Carbs</div>
            <div className="text-3xl font-bold text-white">{client.targetCarbs}g</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 px-6 py-4 rounded-lg min-w-[140px]">
            <div className="text-yellow-400 text-sm font-semibold mb-1">Fats</div>
            <div className="text-3xl font-bold text-white">{client.targetFats}g</div>
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* THE NEW WORKOUT LOGS MODULE */}
        <div className="border border-gray-800 bg-black/50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Training Logs</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
              + Log Session
            </button>
          </div>

          <div className="space-y-4">
            {client.workoutLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8 border border-dashed border-gray-800 rounded-lg">
                No workouts logged yet.
              </div>
            ) : (
              client.workoutLogs.map((log) => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-blue-400">{log.splitType}</span>
                    <span className="text-gray-500 text-sm">{log.date.toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{log.workoutData}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Check-ins Module */}
        <div className="border border-gray-800 border-dashed bg-black/20 rounded-xl p-8 h-64 flex flex-col items-center justify-center text-gray-500">
           <span className="text-xl font-medium mb-2 text-gray-300">Weekly Check-ins</span>
           <span className="text-sm">Module Coming Soon</span>
        </div>
      </div>

    </div>
  )
}