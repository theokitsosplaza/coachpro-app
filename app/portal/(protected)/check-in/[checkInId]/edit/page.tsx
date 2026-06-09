import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { verifyClientSession } from '@/lib/dal'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'
import { PortalEditCheckInForm } from './PortalEditCheckInForm'

export default async function EditCheckInPage({
  params,
}: {
  params: Promise<{ checkInId: string }>
}) {
  const client = await verifyClientSession()
  const { checkInId } = await params

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

  if (!checkIn || checkIn.clientId !== client.id) notFound()
  if (checkIn.status === CHECK_IN_STATUS.Approved) redirect('/portal')

  return <PortalEditCheckInForm checkIn={checkIn} />
}
