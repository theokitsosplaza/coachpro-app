'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'

export type FormErrors = {
  name?: string
  goal?: string
  currentPhase?: string
  targetProtein?: string
  targetCarbs?: string
  targetFats?: string
  _form?: string
}

type ParsedData = {
  name: string
  goal: string
  currentPhase: string
  targetProtein: number
  targetCarbs: number
  targetFats: number
  email: string | null
  phone: string | null
  targetFiber: number | null
}

const VALID_GOALS  = ['Fat Loss', 'Muscle Gain', 'Maintenance', 'Recomp']
const VALID_PHASES = ['Cut', 'Bulk', 'Maintenance', 'Not started yet']

function parseAndValidate(
  formData: FormData,
): { errors: FormErrors; data?: never } | { errors?: never; data: ParsedData } {
  const name         = (formData.get('name') as string).trim()
  const goal         = formData.get('goal') as string
  const currentPhase = formData.get('currentPhase') as string
  const proteinRaw   = formData.get('targetProtein') as string
  const carbsRaw     = formData.get('targetCarbs') as string
  const fatsRaw      = formData.get('targetFats') as string
  const email        = ((formData.get('email') as string) ?? '').trim() || null
  const phone        = ((formData.get('phone') as string) ?? '').trim() || null
  const fiberRaw     = formData.get('targetFiber') as string

  const errors: FormErrors = {}

  if (!name) errors.name = 'Name is required.'
  if (!VALID_GOALS.includes(goal))          errors.goal         = 'Please select a goal.'
  if (!VALID_PHASES.includes(currentPhase)) errors.currentPhase = 'Please select a phase.'

  const targetProtein = parseInt(proteinRaw, 10)
  const targetCarbs   = parseInt(carbsRaw, 10)
  const targetFats    = parseInt(fatsRaw, 10)

  if (!proteinRaw || isNaN(targetProtein) || targetProtein < 0)
    errors.targetProtein = 'Enter a valid amount (0 or more).'
  if (!carbsRaw || isNaN(targetCarbs) || targetCarbs < 0)
    errors.targetCarbs = 'Enter a valid amount (0 or more).'
  if (!fatsRaw || isNaN(targetFats) || targetFats < 0)
    errors.targetFats = 'Enter a valid amount (0 or more).'

  if (Object.keys(errors).length > 0) return { errors }

  const targetFiber = fiberRaw ? parseInt(fiberRaw, 10) : null

  return { data: { name, goal, currentPhase, targetProtein, targetCarbs, targetFats, email, phone, targetFiber } }
}

export async function createClient(
  _prev: FormErrors,
  formData: FormData,
): Promise<FormErrors> {
  const coach = await verifyCoachSession()

  const result = parseAndValidate(formData)
  if (result.errors) return result.errors

  try {
    await prisma.client.create({
      data: { coachId: coach.id, ...result.data },
    })
  } catch (err) {
    console.error('[createClient]', err)
    return { _form: 'Something went wrong saving to the database. Please try again.' }
  }

  redirect('/clients')
}

export async function updateClient(
  clientId: string,
  _prev: FormErrors,
  formData: FormData,
): Promise<FormErrors> {
  const coach = await verifyCoachSession()

  const result = parseAndValidate(formData)
  if (result.errors) return result.errors

  // Fetch current email before writing so we can detect a change.
  // The coachId in the where clause also enforces ownership.
  const current = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { email: true },
  })
  if (!current) return { _form: 'Client not found.' }

  // If the email address changed, clear authUserId so the client must be
  // re-invited at the new address before portal access is restored.
  const emailChanged = result.data.email !== current.email
  const updateData = emailChanged ? { ...result.data, authUserId: null } : result.data

  try {
    await prisma.client.update({
      where: { id: clientId, coachId: coach.id },
      data: updateData,
    })
  } catch (err) {
    console.error('[updateClient]', err)
    return { _form: 'Something went wrong saving to the database. Please try again.' }
  }

  redirect(`/clients/${clientId}`)
}
