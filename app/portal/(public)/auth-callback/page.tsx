'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export default function PortalAuthCallbackPage() {
  const router = useRouter()
  const [debug, setDebug] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const error_dest = '/portal/login?error=invalid_link'

    setDebug(
      `href: ${window.location.href}\nsearch: ${window.location.search}\nhash: ${window.location.hash}`
    )

    // Path A: implicit-flow invite (inviteUserByEmail) — tokens in hash fragment.
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const access_token  = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        // router.replace(error ? error_dest : '/portal')
      })
      return
    }

    // Path B: PKCE magic link (signInWithOtp) — token_hash in query params.
    const searchParams = new URLSearchParams(window.location.search)
    const token_hash = searchParams.get('token_hash')
    const type       = searchParams.get('type') as EmailOtpType | null

    if (token_hash && type) {
      supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
        // router.replace(error ? error_dest : '/portal')
      })
      return
    }

    // Path C: PKCE code exchange (signInWithOtp pkce_ links) — code in query params.
    const code = searchParams.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setDebug(prev => `${prev}\n\nEXCHANGE ERROR: ${error.message} (code: ${error.code ?? 'n/a'}, status: ${error.status ?? 'n/a'})`)
        } else {
          setDebug(prev => `${prev}\n\nEXCHANGE SUCCESS — session established`)
        }
        // router.replace(error ? error_dest : '/portal')
      })
      return
    }

    // router.replace(error_dest)
  }, [router])

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      {debug ? (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 18, padding: 32 }}>
          {debug}
        </pre>
      ) : (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      )}
    </main>
  )
}
