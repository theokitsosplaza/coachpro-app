import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'
import { parseCoachQuestions, parseAnswerSet, isExplicitlyMale } from '@/lib/questionnaire'
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
    select: { id: true, name: true, questionnaireAnswers: true },
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
      clientReflection: true,
      changeNote: true,
      date: true,
    },
  })

  if (!checkIn || checkIn.clientId !== clientId) notFound()

  // Hidden only when Sex is explicitly Male — EXCEPT when this check-in
  // already has the flag set: hiding the control then would silently clear
  // cycleAffected on save. The coach keeps the ability to see and unset it.
  const showCycleFlag =
    !isExplicitlyMale(
      parseCoachQuestions(coach.questionnaire),
      parseAnswerSet(client.questionnaireAnswers),
    ) || checkIn.cycleAffected

  return (
    <CheckInEditForm
      clientId={clientId}
      clientName={client.name}
      showCycleFlag={showCycleFlag}
      checkIn={checkIn}
      wasApproved={checkIn.status === CHECK_IN_STATUS.Approved}
    />
  )
}
