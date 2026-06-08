'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'

export type CheckInFormErrors = {
  weight?: string
  loggedProtein?: string
  loggedCarbs?: string
  loggedFats?: string
  sleepScore?: string
  fatigueScore?: string
  _form?: string
}

export async function createCheckIn(
  clientId: string,
  _prev: CheckInFormErrors,
  formData: FormData,
): Promise<CheckInFormErrors> {
  const coach = await verifyCoachSession()

  const weightRaw    = formData.get('weight') as string
  const proteinRaw   = formData.get('loggedProtein') as string
  const carbsRaw     = formData.get('loggedCarbs') as string
  const fatsRaw      = formData.get('loggedFats') as string
  const sleepRaw     = formData.get('sleepScore') as string
  const fatigueRaw   = formData.get('fatigueScore') as string
  const cycleAffected = formData.get('cycleAffected') === 'on'

  const weight        = parseFloat(weightRaw)
  const loggedProtein = parseInt(proteinRaw, 10)
  const loggedCarbs   = parseInt(carbsRaw, 10)
  const loggedFats    = parseInt(fatsRaw, 10)
  const sleepScore    = parseInt(sleepRaw, 10)
  const fatigueScore  = parseInt(fatigueRaw, 10)

  const errors: CheckInFormErrors = {}

  if (!weightRaw || isNaN(weight) || weight < 30 || weight > 300)
    errors.weight = 'Enter a weight between 30 and 300 kg.'
  if (!proteinRaw || isNaN(loggedProtein) || loggedProtein < 0 || loggedProtein > 1000)
    errors.loggedProtein = 'Enter a value between 0 and 1000 g.'
  if (!carbsRaw || isNaN(loggedCarbs) || loggedCarbs < 0 || loggedCarbs > 1000)
    errors.loggedCarbs = 'Enter a value between 0 and 1000 g.'
  if (!fatsRaw || isNaN(loggedFats) || loggedFats < 0 || loggedFats > 1000)
    errors.loggedFats = 'Enter a value between 0 and 1000 g.'
  if (!sleepRaw || isNaN(sleepScore) || sleepScore < 1 || sleepScore > 10)
    errors.sleepScore = 'Enter a score from 1 to 10.'
  if (!fatigueRaw || isNaN(fatigueScore) || fatigueScore < 1 || fatigueScore > 10)
    errors.fatigueScore = 'Enter a score from 1 to 10.'

  if (Object.keys(errors).length > 0) return errors

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
        status: 'Pending',
      },
    })
  } catch (err) {
    console.error('[createCheckIn]', err)
    return { _form: 'Something went wrong saving to the database. Please try again.' }
  }

  // redirect throws — must be outside try/catch
  redirect(`/ai-check-ins?clientId=${clientId}`)
}
