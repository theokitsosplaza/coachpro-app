import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AddClientForm } from '../../new/AddClientForm'
import { verifyCoachSession } from '@/lib/dal'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const coach = await verifyCoachSession();

  const { id } = await params
  const client = await prisma.client.findFirst({ where: { id, coachId: coach.id } })
  if (!client) notFound()

  return (
    <AddClientForm
      initialValues={{
        id: client.id,
        name: client.name,
        goal: client.goal,
        currentPhase: client.currentPhase,
        targetProtein: client.targetProtein,
        targetCarbs: client.targetCarbs,
        targetFats: client.targetFats,
        email: client.email,
        phone: client.phone,
        targetFiber: client.targetFiber,
      }}
    />
  )
}
