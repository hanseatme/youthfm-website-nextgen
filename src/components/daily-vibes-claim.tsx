'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'

export function DailyVibesClaim() {
  const { user, isLoading } = useAuth()
  const [hasClaimed, setHasClaimed] = useState(false)

  useEffect(() => {
    if (isLoading || !user || hasClaimed) return

    const claimDailyVibes = async () => {
      try {
        const response = await fetch('/api/daily/claim', {
          method: 'POST',
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Show success toast with vibes earned
          toast.success('Tägliche Vibes erhalten!', {
            description: `Du hast ${data.vibes_earned} Vibes verdient! ${
              data.streak > 0 ? `🔥 ${data.streak} Tage Streak` : ''
            }`,
            icon: <Sparkles className="h-5 w-5 text-primary" />,
            duration: 5000,
          })
          setHasClaimed(true)
        } else if (data.already_claimed) {
          // Already claimed today, no need to show anything
          setHasClaimed(true)
        }
      } catch (error) {
        console.error('Failed to claim daily vibes:', error)
        // Silently fail - don't annoy the user
      }
    }

    claimDailyVibes()
  }, [user, isLoading, hasClaimed])

  return null // This component doesn't render anything
}
