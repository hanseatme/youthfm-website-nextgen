'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'
import { Link, useRouter } from '@/i18n/navigation'
import { DmPanel } from '@/components/community/dm-panel'
import { FunkbookPanel } from '@/components/community/funkbook-panel'
import { ChevronLeft, ChevronRight, MessageCircle, MessagesSquare, Trophy, TrendingUp, Send, Reply, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type AvatarMap = Record<number, string>

type ThemeRow = {
  title: string
  title_en: string | null
  teaser: string | null
  teaser_en: string | null
  community_question: string | null
  community_question_en: string | null
}

type ChatMessage = {
  id: string
  content: string
  created_at: string
  user_id: string
  reply_to_id: string | null
  profiles: {
    display_name: string
    avatar_id: number
    username: string | null
  } | null
}

type LeaderboardUser = {
  id: string
  username: string | null
  display_name: string | null
  location: string | null
  avatar_id: number | null
  vibes_total: number
  streak_current: number
}

type ActivityItem = {
  id: string
  created_at: string
  icon: ReactNode
  title: string
  description?: string
  href?: string
}

const VALID_TABS = new Set(['discussion', 'funkbook', 'messages', 'leaderboard'])

export function CommunityCockpit() {
  const t = useTranslations('community')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const { user, isLoading: authLoading } = useAuth()

  const tabParam = searchParams.get('tab') || 'discussion'
  const [tab, setTab] = useState(VALID_TABS.has(tabParam) ? tabParam : 'discussion')
  const tabsListRef = useRef<HTMLDivElement | null>(null)
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false)

  useEffect(() => {
    const next = VALID_TABS.has(tabParam) ? tabParam : 'discussion'
    setTab(next)
  }, [tabParam])

  const updateTabsScroll = () => {
    const el = tabsListRef.current
    if (!el) return
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setCanScrollTabsLeft(el.scrollLeft > 8)
    setCanScrollTabsRight(el.scrollLeft < maxScrollLeft - 8)
  }

  useEffect(() => {
    updateTabsScroll()
    const el = tabsListRef.current
    if (!el) return
    const onScroll = () => updateTabsScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const scrollTabsBy = (dir: 'left' | 'right') => {
    const el = tabsListRef.current
    if (!el) return
    const delta = dir === 'left' ? -220 : 220
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const setTabAndUrl = (next: string) => {
    const safe = VALID_TABS.has(next) ? next : 'discussion'
    setTab(safe)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', safe)
    router.replace(url.pathname + url.search)
  }

  const avatarsQuery = useQuery({
    queryKey: ['avatars'],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatars').select('id, file_path')
      if (error) throw error
      return (data || []) as Array<{ id: number; file_path: string }>
    },
    staleTime: 60 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const avatarMap: AvatarMap = useMemo(() => {
    const map: AvatarMap = {}
    for (const a of avatarsQuery.data || []) map[a.id] = a.file_path
    return map
  }, [avatarsQuery.data])

  const getAvatarUrl = (avatarId: number | null | undefined) => {
    if (!avatarId || !avatarMap[avatarId]) return '/avatars/default.svg'
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarMap[avatarId])
    return data.publicUrl
  }

  const themeQuery = useQuery({
    queryKey: ['daily_theme_for_discussion'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('daily_themes')
        .select('title, title_en, teaser, teaser_en, community_question, community_question_en')
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data || null) as ThemeRow | null
    },
    retry: 3,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  })

  const messagesQuery = useQuery({
    queryKey: ['chat_messages', 'theme'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, user_id, reply_to_id, profiles(display_name, avatar_id, username)')
        .eq('channel', 'theme')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      return (data || []) as unknown as ChatMessage[]
    },
    retry: 4,
    enabled: !authLoading,
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
  })

  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_theme')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'channel=eq.theme' },
        () => queryClient.invalidateQueries({ queryKey: ['chat_messages', 'theme'] })
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          queryClient.invalidateQueries({ queryKey: ['chat_messages', 'theme'] })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { content: string; replyToId?: string | null }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        channel: 'theme',
        content: payload.content,
        reply_to_id: payload.replyToId ?? null,
        status: 'active',
      } as never)

      if (!error) return

      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw error

      const retry = await supabase.from('chat_messages').insert({
        user_id: user.id,
        channel: 'theme',
        content: payload.content,
        reply_to_id: payload.replyToId ?? null,
        status: 'active',
      } as never)

      if (retry.error) throw retry.error
    },
    onSuccess: () => {
      setDraft('')
      setReplyTo(null)
      queryClient.invalidateQueries({ queryKey: ['chat_messages', 'theme'] })
      fetch('/api/badges/check', { method: 'POST' }).catch(() => {})
    },
    onError: (err) => {
      console.error('Failed to send message:', err)
      toast.error(locale === 'de' ? 'Beitrag konnte nicht gesendet werden.' : 'Post could not be sent.')
    },
  })

  const onSubmitDiscussion = (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const content = draft.trim()
    if (!content) return
    sendMessageMutation.mutate({ content, replyToId: replyTo?.id ?? null })
  }

  const themeTitle = themeQuery.data
    ? (locale === 'en' && themeQuery.data.title_en ? themeQuery.data.title_en : themeQuery.data.title)
    : null
  const themeQuestion = themeQuery.data
    ? (locale === 'en' && themeQuery.data.community_question_en ? themeQuery.data.community_question_en : themeQuery.data.community_question)
    : null

  const threaded = useMemo(() => {
    const all = [...(messagesQuery.data || [])]
    const byId = new Map<string, ChatMessage>()
    for (const m of all) byId.set(m.id, m)

    const replies = new Map<string, ChatMessage[]>()
    const roots: ChatMessage[] = []
    for (const m of all) {
      if (m.reply_to_id && byId.has(m.reply_to_id)) {
        const arr = replies.get(m.reply_to_id) || []
        arr.push(m)
        replies.set(m.reply_to_id, arr)
      } else {
        roots.push(m)
      }
    }

    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    for (const [key, arr] of replies) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      replies.set(key, arr)
    }

    return { roots, replies }
  }, [messagesQuery.data])

  const leaderboardPreviewQuery = useQuery({
    queryKey: ['leaderboard_preview_vibes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
        .order('vibes_total', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data || []) as LeaderboardUser[]
    },
    retry: 3,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const leaderboardStreakPreviewQuery = useQuery({
    queryKey: ['leaderboard_preview_streaks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
        .order('streak_current', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data || []) as LeaderboardUser[]
    },
    retry: 3,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const leaderboardVibesQuery = useQuery({
    queryKey: ['leaderboard_top_vibes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
        .order('vibes_total', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data || []) as LeaderboardUser[]
    },
    retry: 3,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const leaderboardStreakQuery = useQuery({
    queryKey: ['leaderboard_top_streaks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
        .order('streak_current', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data || []) as LeaderboardUser[]
    },
    retry: 3,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const activityQuery = useQuery({
    queryKey: ['community_activity'],
    queryFn: async () => {
      const [{ data: feed }, { data: recentPosts }] = await Promise.all([
        supabase
          .from('activity_feed')
          .select('id, user_id, event_type, event_data, created_at, profiles(display_name, username, avatar_id)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('chat_messages')
          .select('id, content, created_at, user_id, profiles(display_name, username, avatar_id)')
          .eq('channel', 'theme')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const items: ActivityItem[] = []

      for (const row of feed || []) {
        const r = row as unknown as {
          id: string
          created_at: string
          event_type: string
          event_data: any
          profiles: { display_name: string; username: string | null; avatar_id: number } | null
        }
        if (r.event_type === 'badge_unlocked') {
          items.push({
            id: `badge:${r.id}`,
            created_at: r.created_at,
            icon: <span className="text-base leading-none">{r.event_data?.badge_icon ?? '🏅'}</span>,
            title: locale === 'de' ? 'Badge freigeschaltet' : 'Badge unlocked',
            description: r.profiles?.display_name ? `${r.profiles.display_name} • ${r.event_data?.badge_name ?? ''}` : r.event_data?.badge_name,
            href: r.profiles?.username ? `/user/${r.profiles.username}` : undefined,
          })
        }
        if (r.event_type === 'vibe_postcard') {
          const note = typeof r.event_data?.note === 'string' ? r.event_data.note : ''
          items.push({
            id: `postcard:${r.id}`,
            created_at: r.created_at,
            icon: <BookOpen className="h-4 w-4 text-muted-foreground" />,
            title: locale === 'de' ? 'Neue Postkarte' : 'New postcard',
            description: r.profiles?.display_name ? `${r.profiles.display_name}: ${note}` : note,
            href: '/community?tab=funkbook',
          })
        }
      }

      for (const row of recentPosts || []) {
        const r = row as unknown as {
          id: string
          created_at: string
          content: string
          profiles: { display_name: string; username: string | null; avatar_id: number } | null
        }
        items.push({
          id: `post:${r.id}`,
          created_at: r.created_at,
          icon: <MessageCircle className="h-4 w-4 text-muted-foreground" />,
          title: locale === 'de' ? 'Neuer Beitrag' : 'New post',
          description: r.profiles?.display_name ? `${r.profiles.display_name}: ${r.content}` : r.content,
          href: r.profiles?.username ? `/user/${r.profiles.username}` : undefined,
        })
      }

      return items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    },
    retry: 2,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  })

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="h-8 w-8" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {locale === 'de'
                ? 'Dein Cockpit für Tagesthema, Beiträge, Rangliste und Nachrichten.'
                : 'Your cockpit for today’s theme, discussion, leaderboard and messages.'}
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTabAndUrl}>
            <div className="relative">
              <TabsList
                ref={tabsListRef}
                className={cn(
                  "flex w-full flex-nowrap gap-1 overflow-x-auto hide-scrollbar justify-start scroll-smooth touch-pan-x",
                  (canScrollTabsLeft || canScrollTabsRight) && "pr-10"
                )}
              >
                <TabsTrigger value="discussion" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {locale === 'de' ? 'Diskussion' : 'Discussion'}
                </TabsTrigger>
                <TabsTrigger value="funkbook" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {locale === 'de' ? 'Funkbuch' : 'Funkbook'}
                </TabsTrigger>
                <TabsTrigger value="messages" className="flex items-center gap-2">
                  <MessagesSquare className="h-4 w-4" />
                  {locale === 'de' ? 'Nachrichten' : 'Messages'}
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {locale === 'de' ? 'Rangliste' : 'Leaderboard'}
                </TabsTrigger>
              </TabsList>

              {(canScrollTabsLeft || canScrollTabsRight) && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-1 lg:hidden">
                  <button
                    type="button"
                    onClick={() => scrollTabsBy('left')}
                    disabled={!canScrollTabsLeft}
                    className={cn(
                      "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full",
                      "bg-background/80 backdrop-blur border border-border/60 shadow-sm",
                      !canScrollTabsLeft && "opacity-0"
                    )}
                    aria-label={locale === 'de' ? 'Tabs nach links' : 'Scroll tabs left'}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTabsBy('right')}
                    disabled={!canScrollTabsRight}
                    className={cn(
                      "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full",
                      "bg-background/80 backdrop-blur border border-border/60 shadow-sm",
                      !canScrollTabsRight && "opacity-0"
                    )}
                    aria-label={locale === 'de' ? 'Tabs nach rechts' : 'Scroll tabs right'}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              <div className="lg:col-span-8 space-y-6">
                <TabsContent value="discussion" className="m-0">
                  <div className="glass-card rounded-3xl p-6">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/50 p-4 bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {locale === 'de' ? 'Tagesthema' : 'Theme of the day'}
                            </p>
                            <p className="text-lg font-semibold truncate">
                              {themeTitle || (locale === 'de' ? 'Heute' : 'Today')}
                            </p>
                          </div>
                          <Button variant="secondary" className="rounded-full w-full sm:w-auto" asChild>
                            <Link href="/">
                              {locale === 'de' ? 'Zum Player' : 'Go to player'}
                            </Link>
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setTabAndUrl('funkbook')}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            {locale === 'de' ? 'Ins Funkbuch schreiben' : 'Write in Funkbook'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            {locale === 'de'
                              ? 'Ritual statt Feed: 1 Postkarte pro Tag.'
                              : 'Ritual over feed: 1 postcard per day.'}
                          </p>
                        </div>
                        {themeQuestion && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {locale === 'de' ? 'Frage:' : 'Question:'}
                            </span>{' '}
                            {themeQuestion}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                          <p className="font-semibold">
                            {locale === 'de' ? 'Diskussion' : 'Discussion'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(messagesQuery.data || []).length} {locale === 'de' ? 'Beiträge' : 'posts'}
                          </p>
                        </div>

                        <ScrollArea className="h-[52vh] sm:h-[420px]">
                          <div className="p-4 space-y-4">
                            {messagesQuery.isLoading ? (
                              <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
                            ) : messagesQuery.isError ? (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {locale === 'de' ? 'Beiträge konnten nicht geladen werden.' : 'Failed to load posts.'}
                                </p>
                                <Button variant="secondary" onClick={() => messagesQuery.refetch()}>
                                  {locale === 'de' ? 'Neu laden' : 'Retry'}
                                </Button>
                              </div>
                            ) : threaded.roots.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {locale === 'de'
                                  ? 'Noch keine Beiträge. Starte die Diskussion zum Tagesthema!'
                                  : 'No posts yet. Start the discussion!'}
                              </p>
                            ) : (
                              threaded.roots.map((msg) => {
                                const author = msg.profiles?.display_name || (locale === 'de' ? 'Unbekannt' : 'Unknown')
                                const replies = threaded.replies.get(msg.id) || []
                                return (
                                  <div key={msg.id} className="space-y-3">
                                    <div className="rounded-2xl border border-border/50 p-4">
                                      <div className="flex items-start gap-3">
                                        <Avatar className="h-9 w-9">
                                          <AvatarImage src={getAvatarUrl(msg.profiles?.avatar_id)} />
                                          <AvatarFallback>{author[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                              <p className="text-sm font-semibold truncate">{author}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {new Date(msg.created_at).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                              </p>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="rounded-full"
                                              onClick={() => setReplyTo(msg)}
                                            >
                                              <Reply className="h-4 w-4 mr-2" />
                                              {locale === 'de' ? 'Antworten' : 'Reply'}
                                            </Button>
                                          </div>
                                          <p className="mt-2 text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {replies.length > 0 && (
                                      <div className="pl-6 border-l border-border/50 space-y-2">
                                        {replies.map((r) => {
                                          const rAuthor = r.profiles?.display_name || (locale === 'de' ? 'Unbekannt' : 'Unknown')
                                          return (
                                            <div key={r.id} className="rounded-2xl border border-border/50 p-3 bg-muted/10">
                                              <div className="flex items-start gap-3">
                                                <Avatar className="h-8 w-8">
                                                  <AvatarImage src={getAvatarUrl(r.profiles?.avatar_id)} />
                                                  <AvatarFallback>{rAuthor[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold truncate">{rAuthor}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {new Date(r.created_at).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                  </div>
                                                  <p className="mt-1 text-sm whitespace-pre-wrap">{r.content}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </ScrollArea>

                        <div className="p-4 border-t border-border/50">
                          {replyTo && (
                            <div className="mb-3 rounded-xl border border-border/50 p-3 bg-muted/20 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  {locale === 'de' ? 'Antwort auf' : 'Replying to'}{' '}
                                  <span className="font-medium text-foreground">
                                    {replyTo.profiles?.display_name || (locale === 'de' ? 'Unbekannt' : 'Unknown')}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setReplyTo(null)}>
                                {locale === 'de' ? 'Abbrechen' : 'Cancel'}
                              </Button>
                            </div>
                          )}

                          {user ? (
                            <form onSubmit={onSubmitDiscussion} className="flex gap-2">
                              <Input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={locale === 'de' ? 'Dein Beitrag zum Tagesthema…' : 'Your take on today’s theme…'}
                                maxLength={500}
                                disabled={sendMessageMutation.isPending}
                              />
                              <Button type="submit" size="icon" disabled={!draft.trim() || sendMessageMutation.isPending}>
                                <Send className="h-4 w-4" />
                              </Button>
                            </form>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              {t('chat.loginRequired')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="funkbook" className="m-0">
                  <FunkbookPanel />
                </TabsContent>

                <TabsContent value="messages" className="m-0">
                  <DmPanel />
                </TabsContent>

                <TabsContent value="leaderboard" className="m-0">
                  <div className="glass-card rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {locale === 'de' ? 'Rangliste' : 'Leaderboard'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-border/50 p-4">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {locale === 'de' ? 'Top Vibes' : 'Top Vibes'}
                        </h3>
                        <LeaderboardClient
                          users={leaderboardVibesQuery.data || []}
                          currentUserId={user?.id ?? null}
                          locale={locale}
                          showVibes
                        />
                      </div>
                      <div className="rounded-2xl border border-border/50 p-4">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                          {locale === 'de' ? 'Top Streaks' : 'Top streaks'}
                        </h3>
                        <LeaderboardClient
                          users={leaderboardStreakQuery.data || []}
                          currentUserId={user?.id ?? null}
                          locale={locale}
                          showVibes={false}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>

              <div className={cn('lg:col-span-4 space-y-6', tab !== 'discussion' && 'hidden lg:block')}>
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      {locale === 'de' ? 'Rangliste (Preview)' : 'Leaderboard (preview)'}
                    </h3>
                    <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setTabAndUrl('leaderboard')}>
                      {locale === 'de' ? 'Öffnen' : 'Open'}
                    </Button>
                  </div>
                  <LeaderboardClient
                    users={leaderboardPreviewQuery.data || []}
                    currentUserId={user?.id ?? null}
                    locale={locale}
                    showVibes
                  />
                </div>

                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {locale === 'de' ? 'Aktivität' : 'Activity'}
                    </h3>
                  </div>
                  {activityQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
                  ) : activityQuery.isError ? (
                    <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Aktivität konnte nicht geladen werden.' : 'Failed to load activity.'}</p>
                  ) : (activityQuery.data || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Noch keine Aktivität.' : 'No activity yet.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {(activityQuery.data || []).map((item) => {
                        const row = (
                          <div className="flex items-start gap-3 rounded-xl border border-border/50 px-3 py-2">
                            <div className="mt-0.5">{item.icon}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(item.created_at).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )

                        if (!item.href) return <div key={item.id}>{row}</div>
                        return (
                          <Link key={item.id} href={item.href} className="block hover:bg-muted/20 rounded-xl">
                            {row}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      {locale === 'de' ? 'Nachrichten' : 'Messages'}
                    </h3>
                    <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setTabAndUrl('messages')}>
                      {locale === 'de' ? 'Öffnen' : 'Open'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'de'
                      ? 'Private Unterhaltungen laufen hier – aber die Diskussion bleibt beim Tagesthema.'
                      : 'Private chats live here — the discussion stays on today’s theme.'}
                  </p>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
