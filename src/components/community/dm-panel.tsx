'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type ConversationRow = {
  conversation_id: string
  other_user_id: string
  other_username: string | null
  other_display_name: string
  other_avatar_id: number | null
  last_message: string | null
  last_message_at: string | null
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

type AvatarMap = Record<number, string>

export function DmPanel() {
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

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

  const conversationsQuery = useQuery({
    queryKey: ['dm_conversations'],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_dm_conversations')
      if (error) throw error
      return (data || []) as ConversationRow[]
    },
    retry: 4,
    refetchOnWindowFocus: true,
    staleTime: 10 * 1000,
  })

  const conversations = useMemo(() => {
    const out: ConversationRow[] = []
    const seen = new Set<string>()
    for (const c of conversationsQuery.data || []) {
      if (seen.has(c.other_user_id)) continue
      seen.add(c.other_user_id)
      out.push(c)
    }
    return out
  }, [conversationsQuery.data])

  const selectedConversation = conversations.find((c) => c.conversation_id === selectedConversationId) || null

  const messagesQuery = useQuery({
    queryKey: ['dm_messages', selectedConversationId],
    enabled: !authLoading && !!user && !!selectedConversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', selectedConversationId!)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) throw error
      return (data || []) as unknown as MessageRow[]
    },
    retry: 3,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!user) return

    const url = new URL(window.location.href)
    const to = url.searchParams.get('to')
    if (!to) return

    const start = async () => {
      const { data: target, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', to)
        .maybeSingle()

      if (error || !target) return

      const otherId = (target as { id: string }).id
      const { data: convId, error: convError } = await supabase.rpc('get_or_create_dm_conversation', {
        p_other_user_id: otherId,
      })
      if (convError || typeof convId !== 'string') return

      setSelectedConversationId(convId)
      url.searchParams.delete('to')
      window.history.replaceState({}, '', url.toString())
      queryClient.invalidateQueries({ queryKey: ['dm_conversations'] })
    }

    start()
  }, [supabase, user, queryClient])

  useEffect(() => {
    if (!selectedConversationId) return

    const channel = supabase
      .channel(`dm_messages_${selectedConversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${selectedConversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['dm_messages', selectedConversationId] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedConversationId, queryClient])

  const sendMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; content: string }) => {
      const { error } = await supabase.from('dm_messages').insert({
        conversation_id: payload.conversationId,
        sender_id: user!.id,
        content: payload.content,
        status: 'active',
      } as never)

      if (error) throw error
    },
    onSuccess: async () => {
      setDraft('')
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ['dm_messages', selectedConversationId] })
      }
      queryClient.invalidateQueries({ queryKey: ['dm_conversations'] })
    },
    onError: (err) => {
      console.error(err)
      toast.error(locale === 'de' ? 'Nachricht konnte nicht gesendet werden.' : 'Message could not be sent.')
    },
  })

  const onSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!selectedConversationId) {
      toast.error(locale === 'de' ? 'Bitte wähle zuerst eine Unterhaltung.' : 'Select a conversation first.')
      return
    }
    if (!draft.trim()) return
    sendMutation.mutate({ conversationId: selectedConversationId, content: draft.trim() })
  }

  if (authLoading) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <p className="text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <p className="text-muted-foreground mb-4">
          {locale === 'de' ? 'Melde dich an, um Nachrichten zu schreiben.' : 'Log in to send messages.'}
        </p>
        <Button asChild className="rounded-full">
          <Link href="/login">{locale === 'de' ? 'Anmelden' : 'Login'}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn('lg:col-span-1', selectedConversationId && 'hidden lg:block')}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{locale === 'de' ? 'Nachrichten' : 'Messages'}</h2>
            <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
              {locale === 'de' ? 'Aktualisieren' : 'Refresh'}
            </Button>
          </div>
          <div className="space-y-2">
            {(conversations || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === 'de' ? 'Noch keine Unterhaltungen.' : 'No conversations yet.'}
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.conversation_id}
                  onClick={() => setSelectedConversationId(c.conversation_id)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                    selectedConversationId === c.conversation_id ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50 border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={getAvatarUrl(c.other_avatar_id)} />
                      <AvatarFallback>{(c.other_display_name?.[0] || 'U').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.other_display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.last_message || (locale === 'de' ? 'Keine Nachrichten' : 'No messages')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={cn('lg:col-span-2', !selectedConversationId && 'hidden lg:block')}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSelectedConversationId(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {locale === 'de' ? 'Zurück' : 'Back'}
            </Button>
            <h2 className="text-lg font-semibold">
              {selectedConversation ? selectedConversation.other_display_name : (locale === 'de' ? 'Unterhaltung' : 'Conversation')}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <ScrollArea className="h-[55vh] sm:h-[420px]">
              <div className="p-4 space-y-3">
                {messagesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Nachrichten konnten nicht geladen werden.' : 'Failed to load messages.'}</p>
                ) : (messagesQuery.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Noch keine Nachrichten.' : 'No messages yet.'}</p>
                ) : (
                  (messagesQuery.data || []).map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <form onSubmit={onSend} className="p-3 border-t border-border/50 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={locale === 'de' ? 'Nachricht schreiben...' : 'Type a message...'}
                disabled={sendMutation.isPending || !selectedConversationId}
                maxLength={500}
              />
              <Button type="submit" size="icon" disabled={sendMutation.isPending || !draft.trim() || !selectedConversationId}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
