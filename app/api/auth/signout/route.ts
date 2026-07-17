import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Sign-out endpoint. Clears the Supabase session cookie and redirects to a
// login page. It exists as a Route Handler (not an inline signOut() call in the
// DAL) for one concrete reason: signOut() clears the session by *writing*
// cookies, and Next.js does not allow setting cookies during Server Component
// render — only in a Server Function or Route Handler. verifyClientSession /
// verifyCoachSession run during render, so they redirect here to actually clear
// the half-authenticated session that strands a user whose auth account has no
// matching Client/Coach row.
//
// It lives under /api/auth/* so the proxy treats it as public (PUBLIC_PATHS),
// making it reachable regardless of auth state.

// Destinations are chosen from a fixed allowlist keyed by `type` — never built
// from caller-supplied text — so this endpoint cannot be turned into an open
// redirect.
const LOGIN_BY_TYPE: Record<string, string> = {
  client: '/portal/login',
  coach: '/login',
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'coach'
  const loginPath = LOGIN_BY_TYPE[type] ?? '/login'

  // scope: 'local' only clears the current session's cookies (matches
  // signOutClient); the local cookie removal still happens even if the revoke
  // network call fails, so this stays robust during an Auth outage.
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })

  const destination = new URL(loginPath, request.url)
  destination.searchParams.set('error', 'no_account')
  return NextResponse.redirect(destination)
}
