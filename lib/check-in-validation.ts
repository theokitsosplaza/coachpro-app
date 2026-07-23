export const MIN_REFLECTION_LENGTH = 10

export type CheckInFormErrors = {
  weight?: string
  loggedProtein?: string
  loggedCarbs?: string
  loggedFats?: string
  sleepScore?: string
  fatigueScore?: string
  clientReflection?: string
  _form?: string
}

type ValidatedCheckIn = {
  ok: true
  weight: number
  loggedProtein: number
  loggedCarbs: number
  loggedFats: number
  sleepScore: number
  fatigueScore: number
  cycleAffected: boolean
  clientReflection: string
}

type ValidationResult =
  | { ok: false; errors: CheckInFormErrors }
  | ValidatedCheckIn

// requireReflection is opt-in so only the client portal form enforces the
// free-text reflection's PRESENCE. The coach-side manual-entry form shares this
// validator and must not be forced to write the client's words on their behalf —
// there the field is optional (empty is valid), but a non-empty entry is held to
// the same minimum length so the AI never reads junk like "ok".
type ValidateOptions = { requireReflection?: boolean }

export function validateCheckInFormData(
  formData: FormData,
  { requireReflection = false }: ValidateOptions = {},
): ValidationResult {
  const weightRaw     = formData.get('weight') as string
  const proteinRaw    = formData.get('loggedProtein') as string
  const carbsRaw      = formData.get('loggedCarbs') as string
  const fatsRaw       = formData.get('loggedFats') as string
  const sleepRaw      = formData.get('sleepScore') as string
  const fatigueRaw    = formData.get('fatigueScore') as string
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

  const clientReflection = ((formData.get('clientReflection') as string | null) ?? '').trim()
  if (requireReflection) {
    if (clientReflection.length < MIN_REFLECTION_LENGTH)
      errors.clientReflection =
        `Please write at least ${MIN_REFLECTION_LENGTH} characters so your coach has real context.`
  } else if (clientReflection.length > 0 && clientReflection.length < MIN_REFLECTION_LENGTH) {
    errors.clientReflection =
      `Add at least ${MIN_REFLECTION_LENGTH} characters, or leave it blank if the client gave no reflection.`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return { ok: true, weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected, clientReflection }
}
