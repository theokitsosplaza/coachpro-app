'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { validateCheckInFormData } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function updateCoachCheckIn(
  clientId: string,
  checkInId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const coach = await verifyCoachSession()

  const result = validateCheckInFormData(formData)
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected } = result

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) return { _form: 'Client not found.' }

  const existing = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: { clientId: true, status: true },
  })
  if (!existing || existing.clientId !== clientId) {
    return { _form: 'Check-in not found.' }
  }

  const wasApproved = existing.status === CHECK_IN_STATUS.Approved

  try {
    await prisma.checkIn.update({
      where: { id: checkInId },
      data: {
        weight,
        loggedProtein,
        loggedCarbs,
        loggedFats,
        sleepScore,
        fatigueScore,
        cycleAffected,
        ...(wasApproved && { status: CHECK_IN_STATUS.Pending, aiSynthesis: null }),
      },
    })
  } catch (err) {
    console.error('[updateCoachCheckIn]', err)
    return { _form: 'Something went wrong saving your changes. Please try again.' }
  }

  redirect(`/clients/${clientId}`)
}
