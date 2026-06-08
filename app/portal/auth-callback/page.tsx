'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PortalAuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const hash   = window.location.hash.slice(1) // strip leading #
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      router.replace('/portal/login?error=invalid_link')
      return
    }

    // Scrub tokens from the URL bar and browser history before the async
    // exchange so they don't linger if the tab is left open or shared.
    history.replaceState(null, '', window.location.pathname + window.location.search)

    ;(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        router.replace('/portal/login?error=invalid_link')
      } else {
        router.push('/portal')
        router.refresh()
      }
    })()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing you in…
      </div>
    </main>
  )
}
