'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyClientSession } from '@/lib/dal'
import { validateCheckInFormData } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function updateClientCheckIn(
  checkInId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const client = await verifyClientSession()

  const result = validateCheckInFormData(formData)
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected } = result

  const existing = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: { clientId: true, status: true },
  })

  if (!existing || existing.clientId !== client.id) {
    return { _form: 'Check-in not found.' }
  }
  if (existing.status === CHECK_IN_STATUS.Approved) {
    return { _form: 'This check-in has been approved by your coach and can no longer be edited.' }
  }

  try {
    await prisma.checkIn.update({
      where: { id: checkInId },
      data: { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected },
    })
  } catch (err) {
    console.error('[updateClientCheckIn]', err)
    return { _form: 'Something went wrong saving your changes. Please try again.' }
  }

  redirect('/portal')
}
