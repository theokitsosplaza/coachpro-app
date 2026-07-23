'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { validateCheckInFormData, combineDayWithTime } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function createCheckIn(
  clientId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const coach = await verifyCoachSession()

  const result = validateCheckInFormData(formData, { requireDate: true })
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected, clientReflection } = result
  if (!result.date) return { _form: 'Missing check-in date.' } // unreachable: requireDate validated above

  // Verify the client belongs to the authenticated coach before writing.
  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) {
    return { _form: 'Client not found.' }
  }

  // The picked calendar day at the current clock time: today behaves exactly
  // like the old now() default, and successive backdated entries (a coach
  // logging a client's history) keep their creation order within a day.
  const now = new Date()
  const date = combineDayWithTime(result.date, now)
  const isBackdated =
    date.getFullYear() !== now.getFullYear() ||
    date.getMonth() !== now.getMonth() ||
    date.getDate() !== now.getDate()

  try {
    // A backdated row lands BEHIND existing check-ins, so any cached analysis
    // on the rows above it predates its existence and would be served stale.
    // Clear the client's non-approved caches in the same transaction — if the
    // clear fails, the create rolls back too (mirrors the language-change
    // pattern in clients/new/actions.ts). Approved history stays frozen.
    await prisma.$transaction([
      prisma.checkIn.create({
        data: {
          clientId,
          date,
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
      }),
      ...(isBackdated
        ? [prisma.checkIn.updateMany({
            where: { clientId, status: { not: CHECK_IN_STATUS.Approved } },
            data: { aiSynthesis: null },
          })]
        : []),
    ])
  } catch (err) {
    console.error('[createCheckIn]', err)
    return { _form: 'Something went wrong saving to the database. Please try again.' }
  }

  // redirect throws — must be outside try/catch
  redirect(`/ai-check-ins?clientId=${clientId}`)
}
