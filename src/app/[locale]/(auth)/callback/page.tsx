'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        router.push(`/${locale}/login?error=auth_callback_error`)
        return
      }

      if (session) {
        router.push(`/${locale}`)
        router.refresh()
      } else {
        router.push(`/${locale}/login`)
      }
    }

    handleCallback()
  }, [router, supabase.auth, locale])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Authentifizierung wird verarbeitet...</p>
    </div>
  )
}
