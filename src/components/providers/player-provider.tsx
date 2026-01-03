'use client'

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'

interface NowPlaying {
  title: string
  artist: string
  artwork?: string
  listeners?: number
}

interface Moderator {
  name: string
  avatar?: string
  isLive: boolean
}

interface PlayerContextType {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  nowPlaying: NowPlaying | null
  moderator: Moderator | null
  play: () => void
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

interface PlayerProviderProps {
  children: ReactNode
  streamUrl: string
  nowPlayingApiUrl: string
}

export function PlayerProvider({ children, streamUrl, nowPlayingApiUrl }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [moderator, setModerator] = useState<Moderator | null>(null)

  // Initialize audio element once
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio(streamUrl)
      audioRef.current.volume = volume
      audioRef.current.preload = 'none'
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [streamUrl])

  // Fetch now playing info
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch(nowPlayingApiUrl)
        if (response.ok) {
          const data = await response.json()
          // Adapt to your API structure
          if (data.now_playing) {
            setNowPlaying({
              title: data.now_playing.song?.title || 'Unknown',
              artist: data.now_playing.song?.artist || 'Unknown Artist',
              artwork: data.now_playing.song?.art,
              listeners: data.listeners?.current,
            })
          }
          if (data.live) {
            setModerator({
              name: data.live.streamer_name || 'DJ',
              avatar: data.live.art,
              isLive: data.live.is_live,
            })
          } else {
            setModerator({
              name: 'AutoDJ',
              isLive: false,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch now playing:', error)
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 5000)
    return () => clearInterval(interval)
  }, [nowPlayingApiUrl])

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggle = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        isPlaying,
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
    </PlayerContext.Provider>
  )
}
