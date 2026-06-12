'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PortalAuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      router.replace('/portal/login?error=invalid_link')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        router.replace('/portal/login?error=invalid_link')
      } else {
        router.replace('/portal')
      }
    })
  }, [router])

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </main>
  )
}
