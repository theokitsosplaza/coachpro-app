'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { validateCheckInFormData } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function createCheckIn(
  clientId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const coach = await verifyCoachSession()

  const result = validateCheckInFormData(formData)
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected, clientReflection } = result

  // Verify the client belongs to the authenticated coach before writing.
  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) {
    return { _form: 'Client not found.' }
  }

  try {
    await prisma.checkIn.create({
      data: {
        clientId,
        weight,
        loggedProtein,
        loggedCarbs,
        loggedFats,
        sleepScore,
        fatigueScore,
        cycleAffected,
        clientReflection,
        status: CHECK_IN_STATUS.Pending,
      },
    })
  } catch (err) {
    console.error('[createCheckIn]', err)
    return { _form: 'Something went wrong saving to the database. Please try again.' }
  }

  // redirect throws — must be outside try/catch
  redirect(`/ai-check-ins?clientId=${clientId}`)
}
