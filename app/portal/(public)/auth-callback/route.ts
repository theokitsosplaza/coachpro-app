import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()

    // If a valid session already exists, do not overwrite it with the token
    // in the URL. Without this guard a logged-in user could paste another
    // client's invite link and silently take over their session.
    // getClaims() is a local JWT check (no network call, no token refresh).
    // It only returns data when the browser's own access token is non-expired,
    // so the guard never fires for users with stale cookies — they go through
    // verifyOtp and get a fresh session via the proven cookie-write path.
    const { data: claimsData } = await supabase.auth.getClaims()
    if (claimsData) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  return NextResponse.redirect(new URL('/portal/login?error=invalid_link', request.url))
}
