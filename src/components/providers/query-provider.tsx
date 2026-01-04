'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AudioPlayerProvider } from '@/lib/hooks/use-audio-player'
import { DailyVibesClaim } from '@/components/daily-vibes-claim'
import { AuthProvider } from '@/components/providers/auth-provider'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AudioPlayerProvider>
          <DailyVibesClaim />
          {children}
        </AudioPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
