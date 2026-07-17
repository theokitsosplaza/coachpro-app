import { NextResponse } from 'next/server'
import { seedCoachConfigs } from '@/lib/seed-coach-config'

export const dynamic = 'force-dynamic'

// Dev-only trigger for the per-coach config seed (mirrors app/api/seed): it is
// 404 in production and only reachable when running locally. Seeds DEFAULT config
// for its targets, so hitting it changes no coach's behaviour. If a target email
// has no matching coach it is reported as `missing_coach` and no row is created.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const results = await seedCoachConfigs()
    const missing = results.filter((r) => r.status === 'missing_coach')
    return NextResponse.json(
      {
        ok: missing.length === 0,
        results,
        ...(missing.length > 0
          ? { warning: 'Some target emails matched no coach — no config was created for them.' }
          : {}),
      },
      { status: missing.length > 0 ? 404 : 200 },
    )
  } catch (err) {
    console.error('[seed-coach-config]', err)
    return NextResponse.json({ error: 'Seed failed.' }, { status: 500 })
  }
}
