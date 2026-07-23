'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { validateCheckInFormData, combineDayWithTime } from '@/lib/check-in-validation'
import type { CheckInFormErrors } from '@/lib/check-in-validation'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'

export async function updateCoachCheckIn(
  clientId: string,
  checkInId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const coach = await verifyCoachSession()

  const result = validateCheckInFormData(formData, { requireDate: true })
  if (!result.ok) return result.errors

  const { weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected, clientReflection } = result
  if (!result.date) return { _form: 'Missing check-in date.' } // unreachable: requireDate validated above

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) return { _form: 'Client not found.' }

  const existing = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: { clientId: true, status: true, date: true },
  })
  if (!existing || existing.clientId !== clientId) {
    return { _form: 'Check-in not found.' }
  }

  const wasApproved = existing.status === CHECK_IN_STATUS.Approved

  // Move only the calendar day; keep the row's original time-of-day so an
  // unrelated edit never reshuffles ordering between same-day rows.
  const date = combineDayWithTime(result.date, existing.date)
  const dateChanged = date.getTime() !== existing.date.getTime()

  try {
    // A date change can hand "latest" to a different row whose cached analysis
    // predates this one, so when the date moved we clear the client's
    // non-approved caches in the SAME transaction: either the row update and
    // the cache clear both land, or neither does (mirrors the language-change
    // pattern in clients/new/actions.ts). Approved history stays frozen.
    await prisma.$transaction([
      prisma.checkIn.update({
        where: { id: checkInId },
        data: {
          date,
          weight,
          loggedProtein,
          loggedCarbs,
          loggedFats,
          sleepScore,
          fatigueScore,
          cycleAffected,
          clientReflection,
          aiSynthesis: null,
          ...(wasApproved && { status: CHECK_IN_STATUS.Pending }),
        },
      }),
      ...(dateChanged
        ? [prisma.checkIn.updateMany({
            where: { clientId, id: { not: checkInId }, status: { not: CHECK_IN_STATUS.Approved } },
            data: { aiSynthesis: null },
          })]
        : []),
    ])
  } catch (err) {
    console.error('[updateCoachCheckIn]', err)
    return { _form: 'Something went wrong saving your changes. Please try again.' }
  }

  redirect(`/clients/${clientId}`)
}

export async function deleteCoachCheckIn(
  clientId: string,
  checkInId: string,
  _prev: CheckInFormErrors,
  _formData: FormData,
): Promise<CheckInFormErrors> {
  // Ownership chain identical to updateCoachCheckIn: session -> coach owns
  // client -> check-in belongs to client. Never trust ids from the form alone.
  const coach = await verifyCoachSession()

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) return { _form: 'Client not found.' }

  const existing = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: { clientId: true },
  })
  if (!existing || existing.clientId !== clientId) {
    return { _form: 'Check-in not found.' }
  }

  try {
    // Removing a row changes every downstream analysis input, and the row that
    // becomes "latest" may carry a cache from before this row existed (possible
    // after earlier date edits). Delete + client-wide non-approved cache clear
    // run as ONE transaction: a failed clear rolls the delete back, so a
    // deleted row can never leave stale caches behind. Approved history stays
    // frozen — Client macro targets and MacroHistory are intentionally NOT
    // reverted (see confirm-card warning in CheckInEditForm).
    await prisma.$transaction([
      prisma.checkIn.delete({ where: { id: checkInId } }),
      prisma.checkIn.updateMany({
        where: { clientId, status: { not: CHECK_IN_STATUS.Approved } },
        data: { aiSynthesis: null },
      }),
    ])
  } catch (err) {
    console.error('[deleteCoachCheckIn]', err)
    return { _form: 'Something went wrong deleting the check-in. Please try again.' }
  }

  redirect(`/clients/${clientId}`)
}
