import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'
import { CheckInEditForm } from './CheckInEditForm'

export default async function EditCheckInPage({
  params,
}: {
  params: Promise<{ id: string; checkInId: string }>
}) {
  const coach = await verifyCoachSession()
  const { id: clientId, checkInId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true, name: true },
  })
  if (!client) notFound()

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: {
      id: true,
      clientId: true,
      status: true,
      weight: true,
      loggedProtein: true,
      loggedCarbs: true,
      loggedFats: true,
      sleepScore: true,
      fatigueScore: true,
      cycleAffected: true,
      date: true,
    },
  })

  if (!checkIn || checkIn.clientId !== clientId) notFound()

  return (
    <CheckInEditForm
      clientId={clientId}
      clientName={client.name}
      checkIn={checkIn}
      wasApproved={checkIn.status === CHECK_IN_STATUS.Approved}
    />
  )
}
