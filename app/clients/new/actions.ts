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
  // Raw field strings preserved on every error path so the form can
  // repopulate exactly what the coach submitted.
  _values?: {
    name: string
    goal: string
    currentPhase: string
    targetProtein: string
    targetCarbs: string
    targetFats: string
    email: string
    phone: string
    targetFiber: string
  }
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

  const _values = {
    name,
    goal,
    currentPhase,
    targetProtein: proteinRaw,
    targetCarbs:   carbsRaw,
    targetFats:    fatsRaw,
    email:         email ?? '',
    phone:         phone ?? '',
    targetFiber:   fiberRaw ?? '',
  }

  const errors: FormErrors = {}

  if (!name) errors.name = 'Name is required.'
  if (!VALID_GOALS.includes(goal))          errors.goal         = 'Please select a goal.'
  if (!VALID_PHASES.includes(currentPhase)) errors.currentPhase = 'Please select a phase.'

  const targetProtein = parseFloat(proteinRaw)
  const targetCarbs   = parseFloat(carbsRaw)
  const targetFats    = parseFloat(fatsRaw)

  if (!proteinRaw || isNaN(targetProtein) || targetProtein < 0)
    errors.targetProtein = 'Enter a valid amount (0 or more).'
  if (!carbsRaw || isNaN(targetCarbs) || targetCarbs < 0)
    errors.targetCarbs = 'Enter a valid amount (0 or more).'
  if (!fatsRaw || isNaN(targetFats) || targetFats < 0)
    errors.targetFats = 'Enter a valid amount (0 or more).'

  if (Object.keys(errors).length > 0) return { errors: { ...errors, _values } }

  const targetFiber = fiberRaw ? parseInt(fiberRaw, 10) : null

  return { data: { name, goal, currentPhase, targetProtein, targetCarbs, targetFats, email, phone, targetFiber } }
}

function valuesFromParsed(data: ParsedData): NonNullable<FormErrors['_values']> {
  return {
    name:          data.name,
    goal:          data.goal,
    currentPhase:  data.currentPhase,
    targetProtein: String(data.targetProtein),
    targetCarbs:   String(data.targetCarbs),
    targetFats:    String(data.targetFats),
    email:         data.email ?? '',
    phone:         data.phone ?? '',
    targetFiber:   data.targetFiber != null ? String(data.targetFiber) : '',
  }
}

export async function createClient(
  _prev: FormErrors,
  formData: FormData,
): Promise<FormErrors> {
  const coach = await verifyCoachSession()

  const result = parseAndValidate(formData)
  if (result.errors) return result.errors

  let newClientId: string
  try {
    const client = await prisma.client.create({
      data: { coachId: coach.id, ...result.data },
      select: { id: true },
    })
    newClientId = client.id
  } catch (err) {
    console.error('[createClient]', err)
    return {
      _form: 'Something went wrong saving to the database. Please try again.',
      _values: valuesFromParsed(result.data),
    }
  }

  redirect(`/clients/${newClientId}`)
}

export async function updateClient(
  clientId: string,
  _prev: FormErrors,
  formData: FormData,
): Promise<FormErrors> {
  const coach = await verifyCoachSession()

  const result = parseAndValidate(formData)
  if (result.errors) return result.errors

  const _values = valuesFromParsed(result.data)

  const current = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { email: true },
  })
  if (!current) return { _form: 'Client not found.', _values }

  const emailChanged = result.data.email !== current.email
  const updateData = emailChanged ? { ...result.data, authUserId: null } : result.data

  try {
    await prisma.client.update({
      where: { id: clientId, coachId: coach.id },
      data: updateData,
    })
  } catch (err) {
    console.error('[updateClient]', err)
    return {
      _form: 'Something went wrong saving to the database. Please try again.',
      _values,
    }
  }

  redirect(`/clients/${clientId}`)
}
