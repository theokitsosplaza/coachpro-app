import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DEFAULT_COACH_CONFIG, type CoachConfig } from '@/lib/coach-config'

/**
 * Idempotent seed for per-coach config rows.
 *
 * IMPORTANT (current product decision): every target below is seeded with the
 * byte-identical DEFAULT config, so running this changes NO coach's behaviour —
 * a default-valued row resolves identically to having no row at all. This exists
 * to prove the mechanism end-to-end and to reconnect real coaches to the table.
 *
 * Chris's INTENDED config is documented but deliberately NOT applied yet:
 *     { showMacros: false, triageEmphasis: 'wellbeing' }
 * It will be enabled only after his direction is confirmed — flip his `config`
 * below to the line above and re-run. (The engine dial half of that is itself a
 * later, separately-gated change.)
 */
const SEED_TARGETS: { email: string; config: CoachConfig }[] = [
  { email: 'chris.vitaeforce@gmail.com', config: DEFAULT_COACH_CONFIG },
]

export type SeedResult =
  | { email: string; status: 'created' | 'updated'; coachId: string }
  | { email: string; status: 'missing_coach' }

/**
 * Seeds each target's CoachConfig row. Never creates an orphan: if no Coach owns
 * a target email, that entry is reported as `missing_coach` and skipped (the FK
 * would also refuse it — this just surfaces a clear signal instead of a crash).
 */
export async function seedCoachConfigs(): Promise<SeedResult[]> {
  const results: SeedResult[] = []

  for (const { email, config } of SEED_TARGETS) {
    const coach = await prisma.coach.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!coach) {
      results.push({ email, status: 'missing_coach' })
      continue
    }

    const existing = await prisma.coachConfig.findUnique({
      where: { coachId: coach.id },
      select: { coachId: true },
    })

    // CoachConfig is a flat bag of JSON-safe primitives, so it's valid jsonb;
    // Prisma's Json input type just can't prove that without an index signature.
    const settings = config as unknown as Prisma.InputJsonValue

    await prisma.coachConfig.upsert({
      where: { coachId: coach.id },
      create: { coachId: coach.id, settings },
      update: { settings },
    })

    results.push({ email, status: existing ? 'updated' : 'created', coachId: coach.id })
  }

  return results
}
