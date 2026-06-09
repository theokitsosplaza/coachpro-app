'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyClientSession } from '@/lib/dal'
import { validateCheckInFormData } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function submitClientCheckIn(
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  // clientId is derived entirely from the verified session — never from form data
  const client = await verifyClientSession()

  const result = validateCheckInFormData(formData)
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected } = result

  try {
    await prisma.checkIn.create({
      data: {
        clientId: client.id,
        weight,
        loggedProtein,
        loggedCarbs,
        loggedFats,
        sleepScore,
        fatigueScore,
        cycleAffected,
        status: CHECK_IN_STATUS.Pending,
      },
    })
  } catch (err) {
    console.error('[submitClientCheckIn]', err)
    return { _form: 'Something went wrong — please try again.' }
  }

  redirect('/portal')
}
