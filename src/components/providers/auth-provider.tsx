'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Profile = Tables<'profiles'>

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return (data as Profile | null) ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const locale = useLocale()
  const supabase = useMemo(() => createClient(), [])
  const activeUserIdRef = useRef<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!activeUserIdRef.current) return
    const nextProfile = await loadProfile(supabase, activeUserIdRef.current)
    setProfile(nextProfile)
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setIsLoading(true)

      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user ?? null

      if (cancelled) return

      activeUserIdRef.current = sessionUser?.id ?? null
      setUser(sessionUser)

      if (sessionUser) {
        const nextProfile = await loadProfile(supabase, sessionUser.id)
        if (!cancelled) setProfile(nextProfile)
      } else {
        setProfile(null)
      }

      if (!cancelled) setIsLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null
      activeUserIdRef.current = nextUser?.id ?? null
      setUser(nextUser)

      if (nextUser) {
        const nextProfile = await loadProfile(supabase, nextUser.id)
        setProfile(nextProfile)
      } else {
        setProfile(null)
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        router.refresh()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    activeUserIdRef.current = null
    router.push(`/${locale}`)
    router.refresh()
  }, [supabase, router, locale])

  const value: AuthContextValue = {
    user,
    profile,
    isLoading,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin: profile?.is_admin ?? false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

