'use client'

import { useState, useRef, useCallback, useEffect, createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'

interface NowPlayingInfo {
  title: string
  artist: string
  artwork?: string
  listeners?: number
  elapsed?: number
  duration?: number
  show?: string
  category?: string
}

interface ModeratorInfo {
  name: string
  avatar?: string
  isLive: boolean
}

interface AudioPlayerContextType {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  volume: number
  isMuted: boolean
  nowPlaying: NowPlayingInfo | null
  moderator: ModeratorInfo | null
  play: () => Promise<void>
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }
  return context
}

interface AudioPlayerProviderProps {
  children: ReactNode
}

// Singleton audio element - persists across re-renders and navigations
let globalAudio: HTMLAudioElement | null = null

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const defaultStreamUrl = process.env.NEXT_PUBLIC_STREAM_URL || 'https://stream.hanseat.me/stream'
  const defaultPollInterval = Number(process.env.NEXT_PUBLIC_NOW_PLAYING_POLL_INTERVAL || 5000)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null)
  const [moderator, setModerator] = useState<ModeratorInfo | null>(null)
  const [streamUrl, setStreamUrl] = useState(defaultStreamUrl)
  const [pollIntervalMs, setPollIntervalMs] = useState(defaultPollInterval)
  const [isStreamEnabled, setIsStreamEnabled] = useState(true)
  const { user } = useAuth()
  const sessionIdRef = useRef<string | null>(null)

  // Initialize global audio element once
  useEffect(() => {
    if (typeof window !== 'undefined' && !globalAudio) {
      globalAudio = new Audio()
      globalAudio.preload = 'none'
      globalAudio.volume = 0.8
    }

    // Sync state with existing audio
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused)
      setVolumeState(globalAudio.volume)
    }

    // Listen for play/pause events from the audio element
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = () => setError('Wiedergabe fehlgeschlagen')

    globalAudio?.addEventListener('play', handlePlay)
    globalAudio?.addEventListener('pause', handlePause)
    globalAudio?.addEventListener('error', handleError)

    return () => {
      globalAudio?.removeEventListener('play', handlePlay)
      globalAudio?.removeEventListener('pause', handlePause)
      globalAudio?.removeEventListener('error', handleError)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) return
        const data = await response.json()

        if (!isActive) return

        if (typeof data.stream_url === 'string' && data.stream_url.length > 0) {
          setStreamUrl(data.stream_url)
        }

        if (typeof data.stream_enabled === 'boolean') {
          setIsStreamEnabled(data.stream_enabled)
          if (!data.stream_enabled && globalAudio && !globalAudio.paused) {
            globalAudio.pause()
          }
        }

        const interval = Number(data.poll_interval)
        if (Number.isFinite(interval) && interval > 0) {
          setPollIntervalMs(interval)
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err)
      }
    }

    fetchSettings()
    return () => {
      isActive = false
    }
  }, [])

  // Fetch now playing info
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('/api/nowplaying')
        if (response.ok) {
          const data = await response.json()

          if (data?.title) {
            setNowPlaying({
              title: data.title || 'Unknown',
              artist: data.artist || 'Unknown Artist',
              artwork: data.artwork || data.artwork_url,
              listeners: data.listeners ?? undefined,
              elapsed: data.elapsed ?? undefined,
              duration: data.duration ?? undefined,
              show: data.show ?? undefined,
              category: data.category ?? undefined,
            })
          }

          if (data?.moderator) {
            setModerator({
              name: data.moderator.name || 'DJ',
              avatar: data.moderator.avatar || undefined,
              isLive: !!data.moderator.isLive,
            })
          } else {
            setModerator({
              name: 'AutoDJ',
              isLive: false,
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch now playing:', err)
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, pollIntervalMs)
    return () => clearInterval(interval)
  }, [pollIntervalMs])

  // Update volume when state changes
  useEffect(() => {
    if (globalAudio) {
      globalAudio.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const play = useCallback(async () => {
    if (!globalAudio) return

    try {
      setIsLoading(true)
      setError(null)

      if (!isStreamEnabled) {
        setError('Stream ist deaktiviert.')
        return
      }

      if (!globalAudio.src || globalAudio.src !== streamUrl) {
        globalAudio.src = streamUrl
      }

      await globalAudio.play()
    } catch (err) {
      setError('Wiedergabe fehlgeschlagen. Bitte versuche es erneut.')
      console.error('Playback error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isStreamEnabled, streamUrl])

  const pause = useCallback(() => {
    if (globalAudio) {
      globalAudio.pause()
    }
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    if (globalAudio) {
      globalAudio.volume = isMuted ? 0 : clampedVolume
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const startListeningSession = useCallback(async () => {
    if (!user || sessionIdRef.current) return
    try {
      const response = await fetch('/api/listening/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      if (!response.ok) return
      const data = await response.json()
      if (data?.session_id) {
        sessionIdRef.current = data.session_id
      }
    } catch (err) {
      console.error('Failed to start listening session:', err)
    }
  }, [user])

  const endListeningSession = useCallback(async () => {
    if (!user || !sessionIdRef.current) return
    const sessionId = sessionIdRef.current
    sessionIdRef.current = null
    try {
      await fetch('/api/listening/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', session_id: sessionId }),
      })
    } catch (err) {
      console.error('Failed to end listening session:', err)
    }
  }, [user])

  useEffect(() => {
    if (isPlaying) {
      startListeningSession()
    } else {
      endListeningSession()
    }
  }, [isPlaying, startListeningSession, endListeningSession])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        fetch('/api/listening/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end', session_id: sessionIdRef.current }),
          keepalive: true,
        }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        isLoading,
        error,
        volume,
        isMuted,
        nowPlaying,
        moderator,
        play,
        pause,
        toggle,
        setVolume,
        toggleMute,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

// For backwards compatibility - simple hook that just uses context
export function useNowPlaying() {
  const { nowPlaying, moderator } = useAudioPlayer()
  return {
    data: nowPlaying,
    moderator,
    isLoading: !nowPlaying,
    error: null,
  }
}
