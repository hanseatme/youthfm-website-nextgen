'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Gamepad2, Trophy, Users, DoorOpen, Maximize2, Minimize2, X } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'

type RoomStatus = 'lobby' | 'running' | 'vote' | 'finished'

type AsteroidsRoom = {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  max_players: number
  created_at: string
  round_number: number
  started_at: string | null
  ended_at: string | null
  vote_action: 'rematch' | 'end' | null
  vote_deadline: string | null
}

type AsteroidsRoomPlayer = {
  room_id: string
  user_id: string
  display_name: string | null
  color: string | null
  joined_at: string
  left_at: string | null
  score: number
  finished_at: string | null
  rematch_choice: boolean | null
}

type HighscoreRow = {
  id: string
  user_id: string
  mode: 'single' | 'multi'
  room_id: string | null
  score: number
  created_at: string
  profiles?: { display_name: string | null; username: string | null } | null
}

type PublicRoomRow = {
  id: string
  code: string
  host_id: string
  host_name: string | null
  status: RoomStatus
  round_number: number
  max_players: number
  player_count: number
  created_at: string
}

type RemotePlayerState = {
  id: string
  x: number
  y: number
  isDead: boolean
  score: number
  display_name?: string | null
  color?: string | null
}

const COLOR_PALETTE = ['#00ffff', '#ff00ff', '#22c55e', '#f97316'] as const

function pickColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return COLOR_PALETTE[h % COLOR_PALETTE.length]
}

export function AsteroidsPanel() {
  const locale = useLocale()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient() as any, [])
  const { user, profile, isLoading: authLoading } = useAuth()

  const [mode, setMode] = useState<'single' | 'multi'>('single')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [room, setRoom] = useState<AsteroidsRoom | null>(null)
  const [localState, setLocalState] = useState<RemotePlayerState | null>(null)
  const [remoteStates, setRemoteStates] = useState<Record<string, RemotePlayerState>>({})

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeReady, setIframeReady] = useState(false)

  const gameShellRef = useRef<HTMLDivElement | null>(null)
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const inputThrottleRef = useRef<number>(0)
  const shootThrottleRef = useRef<number>(0)
  const worldThrottleRef = useRef<number>(0)

  const localColor = useMemo(() => pickColor(user?.id || 'guest'), [user?.id])
  const displayName = profile?.display_name || profile?.username || (locale === 'de' ? 'Du' : 'You')

  const isFullscreen = isNativeFullscreen || isPseudoFullscreen

  useEffect(() => {
    const onFullscreenChange = () => setIsNativeFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    onFullscreenChange()
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isPseudoFullscreen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isPseudoFullscreen])

  const enterFullscreen = async () => {
    const el = gameShellRef.current
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen()
        return
      } catch {
        // fallback below
      }
    }
    setIsPseudoFullscreen(true)
  }

  const exitFullscreen = async () => {
    setIsPseudoFullscreen(false)
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // ignore
      }
    }
  }

  const sendToGame = (type: string, payload?: unknown) => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.postMessage({ source: 'yfm-community', type, payload }, window.location.origin)
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as any
      if (!data || data.source !== 'yfm-asteroids') return

      if (data.type === 'ready') {
        setIframeReady(true)
        return
      }

      if (data.type === 'openMultiplayer') {
        setMode('multi')
        toast.message(locale === 'de' ? 'Multiplayer: Raum erstellen oder beitreten.' : 'Multiplayer: create or join a room.')
        return
      }

      if (data.type === 'state') {
        if (!user) return
        const payload = data.payload || {}
        const next = {
          id: user.id,
          x: Number(payload.x) || 0,
          y: Number(payload.y) || 0,
          isDead: Boolean(payload.isDead),
          score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : (localState?.score ?? 0),
          display_name: displayName,
          color: localColor,
        } satisfies RemotePlayerState
        setLocalState(next)

        return
      }

      if (data.type === 'input') {
        if (mode !== 'multi' || !room || !channelRef.current) return
        const payload = data.payload || {}
        const moveX = Number(payload.moveX) || 0

        const now = Date.now()
        if (now - inputThrottleRef.current < 66) return
        inputThrottleRef.current = now

        channelRef.current
          .send({
            type: 'broadcast',
            event: 'input',
            payload: { id: user?.id, moveX, ts: now },
          })
          .catch(() => {})
        return
      }

      if (data.type === 'shoot') {
        if (mode !== 'multi' || !room || !channelRef.current) return
        const now = Date.now()
        if (now - shootThrottleRef.current < 120) return
        shootThrottleRef.current = now

        channelRef.current
          .send({
            type: 'broadcast',
            event: 'shoot',
            payload: { id: user?.id, ts: now },
          })
          .catch(() => {})
        return
      }

      if (data.type === 'world') {
        if (mode !== 'multi' || !room || room.host_id !== user?.id || !channelRef.current) return
        const now = Date.now()
        if (now - worldThrottleRef.current < 120) return
        worldThrottleRef.current = now

        if (data.payload?.players && Array.isArray(data.payload.players)) {
          const nextRemote: Record<string, RemotePlayerState> = {}
          for (const p of data.payload.players) {
            if (!p?.id) continue
            const state = {
              id: String(p.id),
              x: Number(p.x) || 0,
              y: Number(p.y) || 0,
              isDead: Boolean(p.isDead),
              score: Number(p.score) || 0,
              display_name: p.display_name ?? null,
              color: p.color ?? null,
            } satisfies RemotePlayerState
            if (state.id === user.id) {
              setLocalState(state)
            } else {
              nextRemote[state.id] = state
            }
          }
          setRemoteStates(nextRemote)
        }

        channelRef.current
          .send({
            type: 'broadcast',
            event: 'world',
            payload: { ...data.payload, ts: now },
          })
          .catch(() => {})
        return
      }

      if (data.type === 'requestRematch') {
        if (mode !== 'multi' || !room) return
        proposeRematchMutation.mutate(room.id)
        return
      }

      if (data.type === 'requestEndRoom') {
        if (mode !== 'multi' || !room) return
        endRoomMutation.mutate(room.id)
        return
      }

      if (data.type === 'requestFinalizeRematch') {
        if (mode !== 'multi' || !room) return
        finalizeRematchMutation.mutate(room.id)
        return
      }

      if (data.type === 'requestRespondRematch') {
        if (mode !== 'multi' || !room) return
        const play = Boolean(data.payload?.play)
        respondRematchMutation.mutate({ roomId: room.id, play })
        return
      }

      if (data.type === 'requestLeaveRoom') {
        if (mode !== 'multi' || !room) return
        leaveRoomMutation.mutate()
        return
      }

      if (data.type === 'requestStartRoom') {
        if (mode !== 'multi' || !room) return
        startRoomMutation.mutate()
        return
      }

      if (data.type === 'gameOver') {
        const score = Number(data.payload?.score) || 0
        if (!user) return
        if (mode === 'single') {
          submitSingleMutation.mutate(score)
          return
        }
        if (mode === 'multi' && room) {
          submitMultiMutation.mutate({ roomId: room.id, score })
          return
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room, mode, locale, displayName, localColor, localState?.score])

  // push room state into iframe (so UI/actions happen inside the game)
  // init iframe whenever mode/room changes
  useEffect(() => {
    if (!iframeReady) return
    if (!user) return
    const role =
      mode === 'single'
        ? 'single'
        : room
          ? (room.host_id === user.id ? 'host' : 'client')
          : 'client'
    const statusText =
      mode === 'single'
        ? (locale === 'de' ? 'OFFLINE (SINGLE)' : 'OFFLINE (SINGLE)')
        : room
          ? (room.status === 'lobby'
            ? (locale === 'de' ? `RAUM ${room.code}` : `ROOM ${room.code}`)
            : room.status === 'vote'
              ? (locale === 'de' ? 'ABSTIMMUNG' : 'VOTE')
              : room.status === 'running'
                ? (locale === 'de' ? `MATCH (R${room.round_number || 1})` : `MATCH (R${room.round_number || 1})`)
                : (locale === 'de' ? 'ERGEBNIS' : 'RESULT'))
          : (locale === 'de' ? 'MULTI' : 'MULTI')

    sendToGame('init', {
      playerId: user.id,
      displayName,
      color: localColor,
      statusText,
      role,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeReady, user?.id, mode, room?.id, room?.status, room?.vote_action, room?.code, room?.round_number, locale, displayName, localColor])

  const playersQuery = useQuery({
    queryKey: ['asteroids_room_players', room?.id],
    enabled: !!user && !!room?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asteroids_room_players')
        .select('*')
        .eq('room_id', room!.id)
        .order('joined_at', { ascending: true })
      if (error) throw error
      return (data || []) as AsteroidsRoomPlayer[]
    },
    refetchInterval: room?.status === 'running' ? 3000 : 800,
    refetchOnWindowFocus: true,
    retry: 3,
  })

  const activePlayers = useMemo(() => {
    return (playersQuery.data || []).filter((p) => !p.left_at).slice(0, 4)
  }, [playersQuery.data])

  const playerCount = activePlayers.length
  const myRematchChoice = useMemo(() => {
    if (!user) return null
    const me = activePlayers.find((p) => p.user_id === user.id)
    return me?.rematch_choice ?? null
  }, [activePlayers, user])

  const voteChoicesIn = useMemo(() => {
    return activePlayers.filter((p) => p.rematch_choice !== null).length
  }, [activePlayers])

  const isVoteRoom = room?.status === 'vote' && room.vote_action === 'rematch'

  const allVoteChoicesIn = useMemo(() => {
    if (!isVoteRoom) return false
    if (playerCount < 2) return false
    return voteChoicesIn >= playerCount
  }, [isVoteRoom, playerCount, voteChoicesIn])

  const canStartFromPlayers = useMemo(() => {
    if (!room || !user) return false
    if (room.host_id !== user.id) return false
    if (room.status !== 'lobby') return false
    return playerCount >= 2
  }, [room, user, playerCount])

  // push room/player/vote state into iframe (so UI/actions happen inside the game)
  useEffect(() => {
    if (!iframeReady) return
    if (mode !== 'multi' || !room || !user) {
      sendToGame('roomState', null)
      return
    }

    const isHost = room.host_id === user.id
    const isVote = isVoteRoom

    sendToGame('roomState', {
      room: {
        id: room.id,
        code: room.code,
        host_id: room.host_id,
        status: room.status,
        round_number: room.round_number ?? 1,
        vote_action: room.vote_action ?? null,
        vote_deadline: room.vote_deadline ?? null,
      },
      player_count: playerCount,
      can_start: canStartFromPlayers,
      isHost,
      vote: isVote
        ? {
            active_count: playerCount,
            choices_in: voteChoicesIn,
            all_choices_in: allVoteChoicesIn,
            my_choice: myRematchChoice,
          }
        : null,
      now: Date.now(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    iframeReady,
    mode,
    room?.id,
    room?.status,
    room?.round_number,
    room?.vote_action,
    room?.vote_deadline,
    user?.id,
    playerCount,
    voteChoicesIn,
    allVoteChoicesIn,
    myRematchChoice,
    canStartFromPlayers,
    isVoteRoom,
  ])

  // push roster into iframe (multiplayer roles need it)
  useEffect(() => {
    if (!iframeReady) return
    if (mode !== 'multi' || !room?.id) {
      sendToGame('roster', { players: [] })
      return
    }

    const players = (playersQuery.data || [])
      .filter((p) => !p.left_at)
      .slice(0, 4)
      .map((p) => ({ id: p.user_id, display_name: p.display_name, color: p.color }))

    sendToGame('roster', { players })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersQuery.data, iframeReady, mode, room?.id])

  const roomQuery = useQuery({
    queryKey: ['asteroids_room', room?.id],
    enabled: !!user && !!room?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('asteroids_rooms').select('*').eq('id', room!.id).single()
      if (error) throw error
      return data as AsteroidsRoom
    },
    refetchInterval: 1500,
    refetchOnWindowFocus: true,
    retry: 2,
  })

  // If a room gets deleted (e.g. all players left / cleanup), drop local state gracefully.
  useEffect(() => {
    if (!room) return
    if (!roomQuery.isError) return
    setRoom(null)
    setRemoteStates({})
    sendToGame('reset')
    toast.message(locale === 'de' ? 'Raum ist nicht mehr verfügbar.' : 'Room is no longer available.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomQuery.isError])

  useEffect(() => {
    if (!roomQuery.data?.id) return
    setRoom((prev) => {
      if (!prev) return roomQuery.data
      if (prev.id !== roomQuery.data.id) return roomQuery.data

      const same =
        prev.status === roomQuery.data.status &&
        prev.started_at === roomQuery.data.started_at &&
        prev.ended_at === roomQuery.data.ended_at &&
        prev.round_number === roomQuery.data.round_number &&
        prev.vote_action === roomQuery.data.vote_action &&
        prev.vote_deadline === roomQuery.data.vote_deadline

      if (same) return prev
      return { ...prev, ...roomQuery.data }
    })
  }, [roomQuery.data])

  // Heartbeat: keep the room alive while it's open (prevents 15m inactivity cleanup during a running match).
  useEffect(() => {
    if (!user) return
    if (mode !== 'multi' || !room?.id) return

    let canceled = false
    const touch = async () => {
      try {
        await supabase.rpc('touch_asteroids_room', { p_room_id: room.id })
      } catch {
        // ignore
      }
    }

    void touch()
    const id = window.setInterval(() => {
      if (canceled) return
      void touch()
    }, 60_000)
    return () => {
      canceled = true
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode, room?.id])

  const highscoresQuery = useQuery({
    queryKey: ['asteroids_highscores', mode],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asteroids_highscores')
        .select('id, user_id, mode, room_id, score, created_at, profiles(display_name, username)')
        .eq('mode', mode)
        .order('score', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data || []) as unknown as HighscoreRow[]
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retry: 2,
  })

  const publicRoomsQuery = useQuery({
    queryKey: ['asteroids_public_rooms'],
    enabled: !!user && mode === 'multi' && !room,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_public_asteroids_rooms', { p_limit: 10 })
      if (error) throw error
      return (data || []) as PublicRoomRow[]
    },
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
    retry: 2,
  })

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_asteroids_room', { p_color: localColor })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: (data) => {
      setRoom(data)
      setMode('multi')
      setRemoteStates({})
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      toast.success(locale === 'de' ? `Raum erstellt: ${data.code}` : `Room created: ${data.code}`)
    },
    onError: (err) => {
      console.error(err)
      toast.error(locale === 'de' ? 'Raum konnte nicht erstellt werden.' : 'Could not create room.')
    },
  })

  const joinRoomMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_asteroids_room', { p_code: code, p_color: localColor })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: (data) => {
      setRoom(data)
      setMode('multi')
      setRemoteStates({})
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      toast.success(locale === 'de' ? `Beigetreten: ${data.code}` : `Joined: ${data.code}`)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Beitritt fehlgeschlagen.') : (err?.message || 'Join failed.'))
    },
  })

  const joinPublicRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { data, error } = await supabase.rpc('join_asteroids_room_by_id', { p_room_id: roomId, p_color: localColor })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: (data) => {
      setRoom(data)
      setMode('multi')
      setRemoteStates({})
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      toast.success(locale === 'de' ? `Beigetreten: ${data.code}` : `Joined: ${data.code}`)
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Beitritt fehlgeschlagen.') : (err?.message || 'Join failed.'))
    },
  })

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!room) return
      const { error } = await supabase.rpc('leave_asteroids_room', { p_room_id: room.id })
      if (error) throw error
    },
    onSuccess: () => {
      setRoom(null)
      setRemoteStates({})
      toast.message(locale === 'de' ? 'Raum verlassen.' : 'Left room.')
    },
    onError: (err) => {
      console.error(err)
      toast.error(locale === 'de' ? 'Konnte Raum nicht verlassen.' : 'Could not leave room.')
    },
  })

  const startRoomMutation = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error('No room')
      const { data, error } = await supabase.rpc('start_asteroids_room', { p_room_id: room.id })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: async (data) => {
      setRoom(data)
      toast.success(locale === 'de' ? 'Match gestartet!' : 'Match started!')
      try {
        await channelRef.current?.send({ type: 'broadcast', event: 'reset', payload: { roomId: data.id } })
        await channelRef.current?.send({ type: 'broadcast', event: 'start', payload: { roomId: data.id } })
      } catch {
        // ignore
      }
      sendToGame('reset')
      sendToGame('start', { simulate: true })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Konnte nicht starten.') : (err?.message || 'Could not start.'))
    },
  })

  const proposeRematchMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { data, error } = await supabase.rpc('propose_asteroids_rematch', { p_room_id: roomId })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: async (data) => {
      setRoom(data)
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      toast.message(locale === 'de' ? 'Noch eine Runde? Abstimmung läuft…' : 'Rematch? Voting is open…')
      try {
        await channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: { roomId: data.id } })
      } catch {
        // ignore
      }
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Konnte Abstimmung nicht starten.') : (err?.message || 'Could not start vote.'))
    },
  })

  const endRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { data, error } = await supabase.rpc('end_asteroids_room', { p_room_id: roomId })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: async (data) => {
      setRoom(data)
      toast.message(locale === 'de' ? 'Spiel beendet.' : 'Game ended.')
      try {
        await channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: { roomId: data.id } })
      } catch {
        // ignore
      }
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Konnte Spiel nicht beenden.') : (err?.message || 'Could not end game.'))
    },
  })

  const respondRematchMutation = useMutation({
    mutationFn: async ({ roomId, play }: { roomId: string; play: boolean }) => {
      const { data, error } = await supabase.rpc('respond_asteroids_rematch', { p_room_id: roomId, p_play: play })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: async (_ok, vars) => {
      if (!vars.play) {
        setRoom(null)
        setRemoteStates({})
        sendToGame('reset')
        toast.message(locale === 'de' ? 'Du bist ausgestiegen.' : 'You left the room.')
        return
      }
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', vars.roomId] })
      try {
        await channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: { roomId: vars.roomId } })
      } catch {
        // ignore
      }
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Antwort konnte nicht gespeichert werden.') : (err?.message || 'Could not save answer.'))
    },
  })

  const finalizeRematchMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { data, error } = await supabase.rpc('finalize_asteroids_rematch', { p_room_id: roomId })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: async (data) => {
      setRoom(data)
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      queryClient.invalidateQueries({ queryKey: ['asteroids_highscores', 'multi'] })

      if (data.status !== 'running') return

      setRemoteStates({})
      setLocalState((prev) => (prev ? { ...prev, score: 0, isDead: false } : prev))
      sendToGame('reset')
      try {
        await channelRef.current?.send({ type: 'broadcast', event: 'reset', payload: { roomId: data.id } })
        await channelRef.current?.send({ type: 'broadcast', event: 'start', payload: { roomId: data.id } })
      } catch {
        // ignore
      }
      sendToGame('start', { simulate: true })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(locale === 'de' ? (err?.message || 'Konnte nicht auswerten.') : (err?.message || 'Could not finalize.'))
    },
  })

  const submitSingleMutation = useMutation({
    mutationFn: async (score: number) => {
      const { error } = await supabase.rpc('submit_asteroids_highscore', { p_score: score })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asteroids_highscores', 'single'] })
      toast.success(locale === 'de' ? 'Highscore gespeichert.' : 'Highscore saved.')
    },
    onError: (err) => {
      console.error(err)
      toast.error(locale === 'de' ? 'Highscore konnte nicht gespeichert werden.' : 'Could not save highscore.')
    },
  })

  const submitMultiMutation = useMutation({
    mutationFn: async ({ roomId, score }: { roomId: string; score: number }) => {
      const { data, error } = await supabase.rpc('submit_asteroids_score', { p_room_id: roomId, p_score: score })
      if (error) throw error
      return data as AsteroidsRoom
    },
    onSuccess: (data) => {
      setRoom(data)
      queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', data.id] })
      queryClient.invalidateQueries({ queryKey: ['asteroids_highscores', 'multi'] })
      try {
        void channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: { roomId: data.id } })
      } catch {
        // ignore
      }
    },
    onError: (err) => {
      console.error(err)
      toast.error(locale === 'de' ? 'Score konnte nicht gespeichert werden.' : 'Could not save score.')
    },
  })

  // Realtime channel for multiplayer
  useEffect(() => {
    if (!user || !room?.id || mode !== 'multi') return

    const channel = supabase.channel(`asteroids-room:${room.id}`, {
      config: { presence: { key: user.id } },
    })
    const isHost = room.host_id === user.id

    channel
      .on('broadcast', { event: 'reset' }, () => {
        setRemoteStates({})
        setLocalState((prev) => (prev ? { ...prev, score: 0, isDead: false } : prev))
        sendToGame('reset')
      })
      .on('broadcast', { event: 'start' }, () => {
        setRemoteStates({})
        sendToGame('reset')
        sendToGame('start', { simulate: true })
        setRoom((prev) => (prev ? { ...prev, status: 'running' } : prev))
      })
      .on('broadcast', { event: 'input' }, ({ payload }: { payload: { id?: string; moveX?: number } }) => {
        if (!isHost) return
        if (!payload?.id || payload.id === user.id) return
        sendToGame('remoteInput', payload)
      })
      .on('broadcast', { event: 'shoot' }, ({ payload }: { payload: { id?: string } }) => {
        if (!isHost) return
        if (!payload?.id || payload.id === user.id) return
        sendToGame('remoteShoot', payload)
      })
      .on('broadcast', { event: 'world' }, ({ payload }: { payload: any }) => {
        if (isHost) return
        if (payload?.players && Array.isArray(payload.players)) {
          const nextRemote: Record<string, RemotePlayerState> = {}
          for (const p of payload.players) {
            if (!p?.id) continue
            const state = {
              id: String(p.id),
              x: Number(p.x) || 0,
              y: Number(p.y) || 0,
              isDead: Boolean(p.isDead),
              score: Number(p.score) || 0,
              display_name: p.display_name ?? null,
              color: p.color ?? null,
            } satisfies RemotePlayerState
            if (state.id === user.id) {
              setLocalState(state)
            } else {
              nextRemote[state.id] = state
            }
          }
          setRemoteStates(nextRemote)
        }
        sendToGame('world', payload)
      })
      .on('broadcast', { event: 'refresh' }, () => {
        queryClient.invalidateQueries({ queryKey: ['asteroids_room', room.id] })
        queryClient.invalidateQueries({ queryKey: ['asteroids_room_players', room.id] })
      })
      .subscribe(async (status: string) => {
        if (status !== 'SUBSCRIBED') return
        try {
          await channel.track({
            user_id: user.id,
            display_name: displayName,
            color: localColor,
          })
        } catch {
          // ignore
        }
      })

    channelRef.current = channel
    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // ignore
      }
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, user?.id, mode, displayName, localColor])

  const sortedPlayers = useMemo(() => {
    const merged = (playersQuery.data || [])
      .filter((p) => !p.left_at)
      .map((p) => {
        const live = p.user_id === user?.id ? localState?.score : remoteStates[p.user_id]?.score
        const score = typeof live === 'number' && Number.isFinite(live) ? Math.max(p.score ?? 0, live) : (p.score ?? 0)
        return { ...p, score }
      })
    return merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }, [playersQuery.data, remoteStates, localState?.score, user?.id])

  const winner = useMemo(() => {
    if (!room || (room.status !== 'finished' && room.status !== 'vote')) return null
    const list = sortedPlayers
    if (!list.length) return null
    return list[0]
  }, [room, sortedPlayers])

  const isHost = Boolean(room && user && room.host_id === user.id)
  const isVote = room?.status === 'vote' && room.vote_action === 'rematch'
  const [voteNow, setVoteNow] = useState(() => Date.now())
  const voteDeadlineMs = useMemo(() => (room?.vote_deadline ? new Date(room.vote_deadline).getTime() : null), [room?.vote_deadline])

  useEffect(() => {
    if (!isVote || !voteDeadlineMs) return
    const id = window.setInterval(() => setVoteNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [isVote, voteDeadlineMs])

  const voteSecondsLeft = useMemo(() => {
    if (!isVote || !voteDeadlineMs) return null
    return Math.max(0, Math.ceil((voteDeadlineMs - voteNow) / 1000))
  }, [isVote, voteDeadlineMs, voteNow])

  const autoFinalizeKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!room?.id || !isHost) return
    if (!isVote || !voteDeadlineMs) return
    if (voteDeadlineMs - Date.now() > 0) return

    const key = `${room.id}:${room.vote_deadline}`
    if (autoFinalizeKeyRef.current === key) return
    autoFinalizeKeyRef.current = key

    finalizeRematchMutation.mutate(room.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.vote_deadline, isHost, isVote, voteDeadlineMs])

  if (authLoading) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          {locale === 'de' ? 'Melde dich an, um Asteroids zu spielen.' : 'Log in to play Asteroids.'}
        </p>
        <Button asChild className="rounded-full">
          <Link href="/login">{locale === 'de' ? 'Anmelden' : 'Login'}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            {locale === 'de' ? 'Asteroids' : 'Asteroids'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {locale === 'de'
              ? 'Singleplayer: Highscore. Multiplayer: bis zu 4 Spieler, höchste Punkte gewinnen.'
              : 'Singleplayer: highscore. Multiplayer: up to 4 players, highest score wins.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              if (isFullscreen) {
                void exitFullscreen()
                return
              }
              void enterFullscreen()
            }}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
            {locale === 'de' ? (isFullscreen ? 'Schließen' : 'Vollbild') : (isFullscreen ? 'Exit' : 'Fullscreen')}
          </Button>
          <Button
            size="sm"
            variant={mode === 'single' ? 'default' : 'secondary'}
            className="rounded-full"
            onClick={() => {
              setMode('single')
              setRoom(null)
              setRemoteStates({})
              sendToGame('reset')
            }}
          >
            {locale === 'de' ? 'Single' : 'Single'}
          </Button>
          <Button
            size="sm"
            variant={mode === 'multi' ? 'default' : 'secondary'}
            className="rounded-full"
            onClick={() => {
              setMode('multi')
              sendToGame('reset')
            }}
          >
            {locale === 'de' ? 'Multi' : 'Multi'}
          </Button>
        </div>
      </div>

      {mode === 'multi' && (
        <div className="rounded-3xl border border-border/50 bg-muted/10 p-4 space-y-4">
          {!room ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Öffentliche Räume' : 'Public rooms'}
                </div>
                {publicRoomsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden…' : 'Loading…'}</p>
                ) : publicRoomsQuery.isError ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === 'de' ? 'Räume konnten nicht geladen werden.' : 'Could not load rooms.'}
                  </p>
                ) : (publicRoomsQuery.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {locale === 'de' ? 'Gerade ist kein Raum offen.' : 'No open rooms right now.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(publicRoomsQuery.data || []).map((r) => {
                      const isMine = r.host_id === user.id
                      const canJoin = r.player_count < r.max_players
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            'rounded-2xl border border-border/50 bg-background/40 px-4 py-3 flex items-center justify-between gap-3',
                            isMine && 'border-primary/40'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {locale === 'de' ? 'Raum' : 'Room'} <span className="font-mono">{r.code}</span>
                              </span>
                              {isMine && (
                                <Badge variant="secondary" className="rounded-full">
                                  {locale === 'de' ? 'Dein Raum' : 'Yours'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {locale === 'de' ? 'Host' : 'Host'}: {r.host_name || (locale === 'de' ? 'Player' : 'Player')} •{' '}
                              {r.player_count}/{r.max_players}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => joinPublicRoomMutation.mutate(r.id)}
                            disabled={!canJoin || joinPublicRoomMutation.isPending}
                            title={!canJoin ? (locale === 'de' ? 'Raum ist voll' : 'Room is full') : undefined}
                          >
                            {locale === 'de' ? 'Join' : 'Join'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {locale === 'de' ? 'Per Code beitreten' : 'Join by code'}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder={locale === 'de' ? 'Code eingeben (z.B. A1B2C3)' : 'Enter code (e.g. A1B2C3)'}
                      maxLength={10}
                    />
                    <Button
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => {
                        const code = roomCodeInput.trim()
                        if (!code) return
                        joinRoomMutation.mutate(code)
                      }}
                      disabled={joinRoomMutation.isPending}
                    >
                      <DoorOpen className="h-4 w-4 mr-2" />
                      {locale === 'de' ? 'Join' : 'Join'}
                    </Button>
                  </div>
                </div>
                <Button
                  className="rounded-full"
                  onClick={() => createRoomMutation.mutate()}
                  disabled={createRoomMutation.isPending}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {locale === 'de' ? 'Raum erstellen' : 'Create room'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {locale === 'de' ? 'Raum' : 'Room'}: <span className="font-mono ml-1">{room.code}</span>
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {locale === 'de' ? 'Status' : 'Status'}: {room.status}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {locale === 'de' ? 'Runde' : 'Round'}: {room.round_number ?? 1}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {sortedPlayers.length}/{room.max_players} {locale === 'de' ? 'Spieler' : 'players'}
                  </Badge>
                  {isVote && voteSecondsLeft !== null && (
                    <Badge variant="secondary" className="rounded-full">
                      {locale === 'de' ? 'Abstimmung' : 'Vote'}: {voteSecondsLeft}s
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => leaveRoomMutation.mutate()}
                    disabled={leaveRoomMutation.isPending}
                  >
                    {locale === 'de' ? 'Verlassen' : 'Leave'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedPlayers.map((p) => (
                  <div
                    key={p.user_id}
                    className={cn(
                      'rounded-2xl border border-border/50 bg-background/40 px-4 py-3 flex items-center justify-between gap-3',
                      p.user_id === user.id && 'border-primary/40'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || '#94a3b8' }} />
                        <span className="text-sm font-semibold truncate">
                          {p.display_name || (p.user_id === user.id ? displayName : (locale === 'de' ? 'Spieler' : 'Player'))}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.finished_at
                          ? (locale === 'de' ? 'Fertig' : 'Finished')
                          : room.status === 'running'
                            ? (locale === 'de' ? 'Spielt…' : 'Playing…')
                            : room.status === 'vote'
                              ? (locale === 'de' ? 'Entscheidet…' : 'Deciding…')
                              : (locale === 'de' ? 'Bereit' : 'Ready')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">{p.score ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{locale === 'de' ? 'Punkte' : 'pts'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {winner && (
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-semibold">
                        {locale === 'de' ? 'Gewinner' : 'Winner'}: {winner.display_name || (winner.user_id === user.id ? displayName : 'Player')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {locale === 'de' ? 'Höchste Punkte im Match.' : 'Highest score in the match.'}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{winner.score}</div>
                </div>
              )}

              <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
                {locale === 'de'
                  ? 'Match-Start, Runde beenden und Abstimmung passieren direkt im Spiel.'
                  : 'Match start, end and voting happen inside the game.'}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-border/50 overflow-hidden bg-muted/10">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {mode === 'single'
                ? (locale === 'de' ? 'Highscore (Single)' : 'Highscore (single)')
                : (locale === 'de' ? 'Highscore (Multi)' : 'Highscore (multi)')}
            </span>
          </div>
          {localState?.score !== undefined && (
            <Badge variant="secondary" className="rounded-full">
              {locale === 'de' ? 'Dein Score' : 'Your score'}: {localState.score}
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2">
          {highscoresQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden…' : 'Loading…'}</p>
          ) : highscoresQuery.isError ? (
            <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Highscores konnten nicht geladen werden.' : 'Could not load highscores.'}</p>
          ) : (highscoresQuery.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Noch keine Scores.' : 'No scores yet.'}</p>
          ) : (
            <div className="space-y-2">
              {(highscoresQuery.data || []).map((h, idx) => {
                const name = h.profiles?.display_name || h.profiles?.username || (locale === 'de' ? 'Player' : 'Player')
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-6 text-xs text-muted-foreground tabular-nums">{idx + 1}</span>
                      <span className="truncate">{name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{h.score}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div
        ref={gameShellRef}
        className={cn(
          'rounded-3xl border border-border/50 overflow-hidden bg-black relative',
          isPseudoFullscreen && 'fixed inset-0 z-50 rounded-none border-none'
        )}
      >
        {isPseudoFullscreen && (
          <div className="absolute top-3 right-3 z-10">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => void exitFullscreen()}
              title={locale === 'de' ? 'Vollbild schließen' : 'Exit fullscreen'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={`/${locale}/games/asteroids`}
          title="Asteroids"
          className={cn('w-full block', isPseudoFullscreen ? 'h-[100dvh]' : 'h-[70vh] min-h-[520px]')}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  )
}
