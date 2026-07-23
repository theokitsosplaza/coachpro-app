export const MIN_REFLECTION_LENGTH = 10

// Cap for the coach's optional "did anything change this week?" note — bounds
// the AI prompt. (The client reflection stays deliberately uncapped — that is
// a separate ticket; do not cap it here.)
export const MAX_CHANGE_NOTE_LENGTH = 500

// Earliest calendar day a coach may date a check-in. Fat-finger guard only —
// nothing in the product predates this.
export const MIN_CHECK_IN_DAY = '2020-01-01'

export type CheckInFormErrors = {
  date?: string
  weight?: string
  loggedProtein?: string
  loggedCarbs?: string
  loggedFats?: string
  sleepScore?: string
  fatigueScore?: string
  clientReflection?: string
  changeNote?: string
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
  // Coach's optional this-week change note, trimmed; '' when blank (the coach
  // actions store '' as null). No minimum — "new job" is a meaningful note.
  // The portal forms never submit it and the portal action never writes it.
  changeNote: string
  // Validated "YYYY-MM-DD" calendar day. Present iff requireDate was passed —
  // only the coach forms submit a date; portal check-ins are always stamped
  // now() server-side so clients can never backdate.
  date?: string
}

type ValidationResult =
  | { ok: false; errors: CheckInFormErrors }
  | ValidatedCheckIn

// requireReflection is opt-in so only the client portal form enforces the
// free-text reflection's PRESENCE. The coach-side manual-entry form shares this
// validator and must not be forced to write the client's words on their behalf —
// there the field is optional (empty is valid), but a non-empty entry is held to
// the same minimum length so the AI never reads junk like "ok".
// requireDate is opt-in for the same reason in reverse: only the COACH forms
// carry an editable date (logging or correcting a client's history); the portal
// forms have no date field and their rows keep the now() default.
type ValidateOptions = { requireReflection?: boolean; requireDate?: boolean }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Local-time "YYYY-MM-DD" for a Date — the calendar day the server sees. */
function toDayString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Combine a validated "YYYY-MM-DD" day with the time-of-day of `time`.
 * Used so a date edit moves only the calendar day and keeps the row's original
 * clock time (ordering between same-day rows stays stable), and a backdated
 * create stamps the current clock time onto the picked day.
 */
export function combineDayWithTime(day: string, time: Date): Date {
  const [y, m, d] = day.split('-').map(Number)
  const combined = new Date(time)
  combined.setFullYear(y, m - 1, d)
  return combined
}

export function validateCheckInFormData(
  formData: FormData,
  { requireReflection = false, requireDate = false }: ValidateOptions = {},
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

  // Calendar-day comparison in server-local time via ISO string ordering, so
  // "today" always passes regardless of the time of day it is submitted.
  let date: string | undefined
  if (requireDate) {
    const dateRaw = ((formData.get('date') as string | null) ?? '').trim()
    if (!DAY_RE.test(dateRaw) || Number.isNaN(new Date(`${dateRaw}T00:00:00`).getTime()))
      errors.date = 'Enter a valid date.'
    else if (dateRaw > toDayString(new Date()))
      errors.date = 'Check-in date cannot be in the future.'
    else if (dateRaw < MIN_CHECK_IN_DAY)
      errors.date = `Check-in date cannot be before ${MIN_CHECK_IN_DAY.slice(0, 4)}.`
    else
      date = dateRaw
  }

  const changeNote = ((formData.get('changeNote') as string | null) ?? '').trim()
  if (changeNote.length > MAX_CHANGE_NOTE_LENGTH)
    errors.changeNote = `Keep the change note under ${MAX_CHANGE_NOTE_LENGTH} characters.`

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

  return { ok: true, weight, loggedProtein, loggedCarbs, loggedFats, sleepScore, fatigueScore, cycleAffected, clientReflection, changeNote, date }
}
