import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AddClientForm } from '../../new/AddClientForm'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })
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
