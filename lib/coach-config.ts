import { toLanguage, type Language } from '@/lib/i18n/languages'

/**
 * Per-coach configuration — TS is the SOURCE OF TRUTH for which dials exist and
 * their defaults; the DB (Coach.config, a jsonb bag — the same storage shape as
 * Coach.questionnaire) only persists a coach's overrides.
 *
 * Defaults are chosen so a coach with NO config — or a config missing a key, or
 * holding a garbage value — resolves to behaviour IDENTICAL to before this
 * system existed. That identical-by-default property is the safety net.
 *
 * Adding a future dial is a TS-only change: add a key to CoachConfig, a default
 * to DEFAULT_COACH_CONFIG, and one validation line to mergeCoachConfig. No DB
 * migration is ever required.
 *
 * Ported from the retired feature/coach-config branch (separate-table design),
 * minus the DB accessor: the four coach pages already load the full Coach row
 * via verifyCoachSession, so config is read with mergeCoachConfig(coach.config)
 * — no extra query.
 */

export type SummaryStyle = 'detailed' | 'concise'

export interface CoachConfig {
  /**
   * Presentation + narrative dial. When false, this coach's views hide the
   * macro-COMPLIANCE surfaces (dashboard stat, client-detail adherence badge,
   * AI-review cal-adherence stat) AND the coachSummary is instructed to omit
   * macro/adherence language. Raw macro targets and the macro editor are
   * unaffected. For training-only coaches who don't run nutrition.
   */
  showMacros: boolean
  /**
   * Narrative dial. When false, the AI does NOT generate a client-facing
   * message at all (the output field is dropped from the prompt schema, not
   * generated-then-discarded). The coach still gets coachSummary and the
   * attention flag. For coaches who reply by video or keep AI away from
   * client communication.
   */
  draftClientMessage: boolean
  /**
   * Applied as the default language for NEWLY created clients only. Never
   * touches existing clients. One of the existing registry languages.
   */
  defaultClientLanguage: Language
  /**
   * coachSummary length dial. 'detailed' reproduces today's behaviour exactly.
   * 'concise' compresses the NUMBERS half (trend, adherence, recommendation)
   * to one clause while KEEPING the full explanation of anything derived from
   * the client's reflection, the coach's change note, or a safety flag — the
   * human signal is never shortened, and the attention flag's reason is
   * untouched. Affects coachSummary only. See lib/ai-coach.ts.
   */
  summaryStyle: SummaryStyle
}

export const DEFAULT_COACH_CONFIG: CoachConfig = {
  showMacros: true,
  draftClientMessage: true,
  defaultClientLanguage: 'en',
  summaryStyle: 'detailed',
}

/**
 * Per-key VALIDATED merge of a stored jsonb bag over the defaults. Never trusts
 * the stored shape: each key is taken only if present AND the correct type /
 * allowed value; anything else falls back to the default. Always returns a
 * total, valid CoachConfig, so a malformed column can never reach a view, the
 * prompt, or client creation. Pure and DB-free — safe to unit-test.
 */
export function mergeCoachConfig(stored: unknown): CoachConfig {
  const out: CoachConfig = { ...DEFAULT_COACH_CONFIG }
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const s = stored as Record<string, unknown>
    if (typeof s.showMacros === 'boolean') out.showMacros = s.showMacros
    if (typeof s.draftClientMessage === 'boolean') out.draftClientMessage = s.draftClientMessage
    // toLanguage soft-resolves: unknown/absent ⇒ 'en'. Only override the
    // default when the stored value resolves to a real, known language.
    if (typeof s.defaultClientLanguage === 'string') {
      out.defaultClientLanguage = toLanguage(s.defaultClientLanguage)
    }
    // Only 'concise' overrides the default; missing/garbage/'detailed' all stay
    // 'detailed', so a malformed value can never silently shorten a summary.
    if (s.summaryStyle === 'concise') out.summaryStyle = 'concise'
  }
  return out
}
