// THROWAWAY — delete this file after Step 1 testing is complete.
// Fires a magic-link email for the coach account pointed at /auth-callback.
// Usage: GET https://vimafy.com/api/test-coach-invite

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COACH_EMAIL      = 'theokitsosplaza@yahoo.com'
const REDIRECT_TO      = 'https://vimafy.com/auth-callback'

export async function GET() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: COACH_EMAIL,
    options: {
      shouldCreateUser: false,
      emailRedirectTo:  REDIRECT_TO,
    },
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok:       true,
    message:  `Magic link sent to ${COACH_EMAIL}`,
    redirect: REDIRECT_TO,
  })
}
