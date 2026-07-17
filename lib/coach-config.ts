import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'

/**
 * Per-coach configuration — the SOURCE OF TRUTH for which dials exist and their
 * defaults. The DB (CoachConfig.settings, a jsonb bag) only persists a coach's
 * overrides; the shape and defaults live here in TS.
 *
 * The defaults are chosen so that a coach with NO config row — or a row that is
 * missing a key, or holds a garbage value — resolves to behaviour IDENTICAL to
 * before this system existed. That identical-by-default property is the safety
 * net: shipping this changes nothing visible until a specific dial is set.
 *
 * Adding a future dial is a TS-only change: add a key to `CoachConfig`, a default
 * to `DEFAULT_COACH_CONFIG`, and one validation line to `mergeCoachConfig`. No DB
 * migration is ever required.
 */

export type TriageEmphasis = 'macros' | 'wellbeing'

export interface CoachConfig {
  /**
   * Presentation dial. When false, this coach's views hide the macro-COMPLIANCE
   * surfaces (dashboard stat, client-detail adherence badge, AI-review cal
   * adherence). Raw macro targets and the macro editor are unaffected.
   */
  showMacros: boolean
  /**
   * Engine dial. Which already-computed signal family leads the triage verdict.
   * 'macros' reproduces today's behaviour exactly. NOT yet read by the engine
   * (that is a later, separately-gated phase).
   */
  triageEmphasis: TriageEmphasis
}

export const DEFAULT_COACH_CONFIG: CoachConfig = {
  showMacros: true,
  triageEmphasis: 'macros',
}

const TRIAGE_EMPHASIS_VALUES: readonly TriageEmphasis[] = ['macros', 'wellbeing']

/**
 * Per-key VALIDATED merge of a stored jsonb bag over the defaults. Never trusts
 * the stored shape: each key is taken only if it is present AND the correct type
 * / an allowed value; anything else (missing, wrong type, unknown enum, outright
 * garbage) falls back to the default. Always returns a total, valid CoachConfig,
 * so a malformed row can never reach a view or the engine.
 *
 * Pure and DB-free — safe to unit-test in isolation.
 */
export function mergeCoachConfig(stored: unknown): CoachConfig {
  const out: CoachConfig = { ...DEFAULT_COACH_CONFIG }
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const s = stored as Record<string, unknown>
    if (typeof s.showMacros === 'boolean') {
      out.showMacros = s.showMacros
    }
    if (
      typeof s.triageEmphasis === 'string' &&
      TRIAGE_EMPHASIS_VALUES.includes(s.triageEmphasis as TriageEmphasis)
    ) {
      out.triageEmphasis = s.triageEmphasis as TriageEmphasis
    }
  }
  return out
}

/**
 * The ONLY read path for a coach's config. Returns a fully-populated, validated
 * CoachConfig; a coach with no row resolves to pure defaults. Wrapped in React
 * cache() so repeated calls within one server render hit the DB at most once
 * (same pattern as verifyCoachSession).
 */
export const getCoachConfig = cache(async (coachId: string): Promise<CoachConfig> => {
  const row = await prisma.coachConfig.findUnique({
    where: { coachId },
    select: { settings: true },
  })
  return mergeCoachConfig(row?.settings ?? null)
})
