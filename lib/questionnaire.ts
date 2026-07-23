/**
 * CoachPro — Per-coach client context questionnaire
 * ---------------------------------------------------------------------------
 * Each coach defines a flat list of questions (three types only: short text,
 * number, single-select) asked once per client at onboarding. The COACH fills
 * in the answers on the client record; the answers become stable context the
 * AI narrative layer reads on every check-in.
 *
 * Storage (both columns added to prod via surgical `prisma db execute`, never
 * `db push` — see prisma/add-questionnaire-columns.sql):
 *   - Coach.questionnaire        jsonb  → CoachQuestion[]   (null ⇒ DEFAULT_QUESTIONS)
 *   - Client.questionnaireAnswers jsonb → AnswerSet         (null ⇒ no context)
 *
 * Two load-bearing decisions:
 *
 * 1. ANSWERS ARE SNAPSHOTS. Every answer stores the question label + type as
 *    they were when answered. The AI context and the Background card render
 *    from the snapshot's labels — never by joining against the coach's live
 *    question list — so a later question change can never silently alter what
 *    a recorded answer means.
 *
 * 2. PURGE ON DELETE. Context rendering includes ONLY answers whose questionId
 *    still exists in the coach's CURRENT question list. The moment a coach
 *    deletes a question, its stored answers stop reaching the AI (and the
 *    Background card) for every client — no per-client re-save needed. The
 *    snapshot data itself is retained until the client's answers are next
 *    saved, but it is invisible and inert.
 *
 * HARD BOUNDARY (enforced in lib/ai-coach.ts): this context feeds the
 * coach-facing synthesis and the attention flag ONLY. It never reaches
 * lib/coach-engine.ts, never influences the macro proposal, and never appears
 * in clientMessage.
 * ---------------------------------------------------------------------------
 */

export type QuestionType = 'text' | 'number' | 'select'

export interface CoachQuestion {
  id: string
  label: string
  type: QuestionType
  /** select only — ignored (and stripped) for other types */
  options?: string[]
}

export interface AnswerSnapshot {
  questionId: string
  /** The question label AS ANSWERED — the snapshot that keeps stored context truthful. */
  label: string
  type: QuestionType
  /** Always a string, numbers included. The AI is forbidden from computing with it. */
  value: string
}

export interface AnswerSet {
  answeredAt: string // ISO timestamp of the last save
  answers: AnswerSnapshot[]
}

// ── Limits (bound the prompt, nothing more — no per-question configurability) ──

export const MAX_QUESTIONS       = 40
export const MAX_QUESTION_LABEL  = 120
export const MAX_SELECT_OPTIONS  = 12
export const MIN_SELECT_OPTIONS  = 2
export const MAX_OPTION_LENGTH   = 60
export const MAX_ANSWER_LENGTH   = 500

const QUESTION_TYPES: readonly QuestionType[] = ['text', 'number', 'select'] as const

export function isQuestionType(v: unknown): v is QuestionType {
  return typeof v === 'string' && (QUESTION_TYPES as readonly string[]).includes(v)
}

// ── Default question set ──────────────────────────────────────────────────────
// Coaches can remove or reorder any of these, and add their own. Ids are stable
// slugs so answers keyed to a default question survive the coach customising
// the rest of the list. Deliberately NO PAR-Q / medical screening questions.

export const DEFAULT_QUESTIONS: CoachQuestion[] = [
  { id: 'height',                label: 'Height (cm)',                                        type: 'number' },
  { id: 'age',                   label: 'Age',                                                type: 'number' },
  { id: 'sex',                   label: 'Sex',                                                type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
  { id: 'occupation',            label: 'Occupation type',                                    type: 'select', options: ['Desk', 'On-foot', 'Physical'] },
  { id: 'daily-steps',           label: 'Typical daily steps',                                type: 'number' },
  { id: 'training-years',        label: 'Training experience (years)',                        type: 'number' },
  { id: 'sessions-per-week',     label: 'Training sessions per week',                         type: 'number' },
  { id: 'injuries',              label: 'Injuries or limitations',                            type: 'text' },
  { id: 'sleep-hours',           label: 'Usual sleep (hours per night)',                      type: 'number' },
  { id: 'dietary-restrictions',  label: 'Dietary restrictions',                               type: 'text' },
  { id: 'food-allergies',        label: 'Food allergies',                                     type: 'text' },
  { id: 'supplements',           label: 'Supplements',                                        type: 'text' },
  { id: 'cardio',                label: 'Cardio type and frequency',                          type: 'text' },
  { id: 'tracked-macros-before', label: 'Has the client tracked macros before?',              type: 'select', options: ['Yes', 'No'] },
  { id: 'stress-level',          label: 'Typical stress level',                               type: 'select', options: ['Low', 'Moderate', 'High'] },
  { id: 'who-cooks',             label: 'Who cooks at home?',                                 type: 'text' },
  { id: 'tried-before',          label: "What have they tried before, and what went wrong?",  type: 'text' },
  { id: 'good-week',             label: '"What does a good week look like for you?"',         type: 'text' },
]

// ── Lenient parsing (reads) ───────────────────────────────────────────────────
// Reads must never throw: a malformed row degrades to defaults / no context,
// mirroring toLanguage()'s soft-fallback philosophy.

function sanitizeQuestion(raw: unknown): CoachQuestion | null {
  if (raw == null || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>
  if (typeof q.id !== 'string' || !q.id.trim() || q.id.length > 64) return null
  if (typeof q.label !== 'string' || !q.label.trim()) return null
  if (!isQuestionType(q.type)) return null
  const base: CoachQuestion = {
    id: q.id.trim(),
    label: q.label.trim().slice(0, MAX_QUESTION_LABEL),
    type: q.type,
  }
  if (q.type === 'select') {
    if (!Array.isArray(q.options)) return null
    const options = q.options
      .filter((o): o is string => typeof o === 'string' && !!o.trim())
      .map((o) => o.trim().slice(0, MAX_OPTION_LENGTH))
      .slice(0, MAX_SELECT_OPTIONS)
    if (options.length < MIN_SELECT_OPTIONS) return null
    base.options = options
  }
  return base
}

/**
 * Coach.questionnaire → CoachQuestion[].
 * null/undefined ⇒ DEFAULT_QUESTIONS (coach never customised).
 * A stored array ⇒ its valid entries — INCLUDING the empty array, which means
 * the coach deliberately deleted everything.
 * Garbage ⇒ DEFAULT_QUESTIONS.
 */
export function parseCoachQuestions(raw: unknown): CoachQuestion[] {
  if (raw == null) return DEFAULT_QUESTIONS
  if (!Array.isArray(raw)) return DEFAULT_QUESTIONS
  return raw
    .map(sanitizeQuestion)
    .filter((q): q is CoachQuestion => q !== null)
    .slice(0, MAX_QUESTIONS)
}

/** Client.questionnaireAnswers → AnswerSet | null. Never throws. */
export function parseAnswerSet(raw: unknown): AnswerSet | null {
  if (raw == null || typeof raw !== 'object') return null
  const set = raw as Record<string, unknown>
  if (!Array.isArray(set.answers)) return null
  const answers = set.answers
    .map((a: unknown): AnswerSnapshot | null => {
      if (a == null || typeof a !== 'object') return null
      const s = a as Record<string, unknown>
      if (typeof s.questionId !== 'string' || !s.questionId) return null
      if (typeof s.label !== 'string' || !s.label.trim()) return null
      if (!isQuestionType(s.type)) return null
      if (typeof s.value !== 'string' || !s.value.trim()) return null
      return {
        questionId: s.questionId,
        label: s.label.trim(),
        type: s.type,
        value: s.value.trim().slice(0, MAX_ANSWER_LENGTH),
      }
    })
    .filter((a): a is AnswerSnapshot => a !== null)
  if (answers.length === 0) return null
  return {
    answeredAt: typeof set.answeredAt === 'string' ? set.answeredAt : '',
    answers,
  }
}

// ── Strict validation (writes) ────────────────────────────────────────────────
// Saves reject rather than silently repair, so a coach never loses a question
// to a quiet sanitiser.

export type ValidateQuestionsResult =
  | { ok: true; questions: CoachQuestion[] }
  | { ok: false; error: string }

export function validateQuestions(raw: unknown): ValidateQuestionsResult {
  if (!Array.isArray(raw)) return { ok: false, error: 'Invalid questionnaire payload.' }
  if (raw.length > MAX_QUESTIONS) return { ok: false, error: `At most ${MAX_QUESTIONS} questions.` }
  const seen = new Set<string>()
  const questions: CoachQuestion[] = []
  for (const entry of raw) {
    const q = sanitizeQuestion(entry)
    if (!q) return { ok: false, error: 'A question is missing a label, a valid type, or (for single-select) at least two options.' }
    if (seen.has(q.id)) return { ok: false, error: 'Duplicate question id.' }
    seen.add(q.id)
    questions.push(q)
  }
  return { ok: true, questions }
}

// ── Context rendering (the single path answers take to the AI) ────────────────

/**
 * The answers that are currently VISIBLE — the purge-on-delete filter.
 * Includes only answers whose questionId exists in the coach's current
 * question list, ordered by the current list, labelled from the SNAPSHOT.
 * Used by both the AI context below and the client page's Background card,
 * so what the coach sees is exactly what the AI reads.
 */
export function visibleAnswers(
  questions: CoachQuestion[],
  answerSet: AnswerSet | null,
): AnswerSnapshot[] {
  if (!answerSet) return []
  const byId = new Map(answerSet.answers.map((a) => [a.questionId, a]))
  const out: AnswerSnapshot[] = []
  for (const q of questions) {
    const a = byId.get(q.id)
    if (a) out.push(a)
  }
  return out
}

/**
 * The exact string handed to lib/ai-coach.ts as questionnaireContext.
 * Empty string ⇒ the AI layer omits the background block and clause entirely,
 * keeping no-questionnaire prompts byte-for-byte identical to before this
 * feature existed.
 */
export function renderQuestionnaireContext(
  questions: CoachQuestion[],
  answerSet: AnswerSet | null,
): string {
  return visibleAnswers(questions, answerSet)
    .map((a) => `${a.label}: ${a.value}`)
    .join('\n')
}
