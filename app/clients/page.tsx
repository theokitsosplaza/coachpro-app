import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ClientsPage() {
  
  // 1. Fetch the live roster directly from Supabase
  const roster = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* Header with the Add Client Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Master Roster</h1>
        <Link 
          href="/clients/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Client
        </Link>
      </div>
      
      <div className="grid gap-4">
        {roster.map((client) => (
          <Link href={`/clients/${client.id}`} key={client.id} className="block">
            <div className="p-6 border border-gray-800 bg-black/50 rounded-xl shadow-sm hover:border-gray-600 hover:bg-gray-900 transition-all cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-white">{client.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Goal: <span className="text-white">{client.goal}</span> | Phase: <span className="text-white">{client.currentPhase}</span>
                  </p>
                </div>
                
                <div className="flex gap-3 text-sm font-medium">
                  <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full border border-blue-800">
                    {client.targetProtein}g Protein
                  </span>
                  <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full border border-green-800">
                    {client.targetCarbs}g Carbs
                  </span>
                  <span className="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full border border-yellow-800">
                    {client.targetFats}g Fats
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {roster.length === 0 && (
          <div className="text-gray-500 text-center py-10">
            No clients found. Time to sign some up!
          </div>
        )}
      </div>
    </div>
  )
}