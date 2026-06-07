import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { CheckInForm } from './CheckInForm'

export default async function NewCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      checkIns: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  if (!client) notFound()

  const last = client.checkIns[0] ?? null

  return (
    <CheckInForm
      clientId={client.id}
      clientName={client.name}
      lastCheckIn={last ? {
        weight:        last.weight,
        loggedProtein: last.loggedProtein,
        loggedCarbs:   last.loggedCarbs,
        loggedFats:    last.loggedFats,
        sleepScore:    last.sleepScore,
        fatigueScore:  last.fatigueScore,
      } : null}
    />
  )
}
