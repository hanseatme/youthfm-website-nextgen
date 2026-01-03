'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, Users, TrendingUp, Send } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { Link } from '@/i18n/navigation'

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    display_name: string
    avatar_id: number
    username: string | null
  } | null
}

interface OnlineUser {
  id: string
  display_name: string
  username: string | null
  avatar_id: number
  vibes_total: number
}

interface AvatarMap {
  [key: number]: string
}

export default function CommunityPage() {
  const t = useTranslations('community')
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [avatarMap, setAvatarMap] = useState<AvatarMap>({})
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadAvatars()
    loadMessages()
    loadOnlineUsers()

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadAvatars() {
    const { data } = await supabase
      .from('avatars')
      .select('id, file_path')

    if (data) {
      const map: AvatarMap = {}
      data.forEach((avatar: { id: number; file_path: string }) => {
        map[avatar.id] = avatar.file_path
      })
      setAvatarMap(map)
    }
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, content, created_at, user_id, profiles(display_name, avatar_id, username)')
      .eq('channel', 'main')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading messages:', error)
    }

    if (data) {
      setMessages(data as unknown as ChatMessage[])
    }
    setIsLoading(false)
  }

  async function loadOnlineUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_id, vibes_total')
      .order('vibes_total', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error loading online users:', error)
    }

    if (data) {
      setOnlineUsers(data as OnlineUser[])
    }
  }

  function getAvatarUrl(avatarId: number | null | undefined) {
    if (!avatarId || !avatarMap[avatarId]) return '/avatars/default.png'
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarMap[avatarId])
    return data.publicUrl
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      channel: 'main',
      content: newMessage.trim(),
      status: 'active',
    } as never)

    if (!error) {
      setNewMessage('')
      loadMessages()
      fetch('/api/badges/check', { method: 'POST' }).catch(() => {})
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="relative">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Area */}
            <div className="lg:col-span-3">
              <div className="glass-card rounded-3xl h-[600px] flex flex-col p-6">
                <div className="pb-4 border-b border-border/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {t('chat.title')}
                  </h3>
                </div>
                <div className="flex-1 flex flex-col pt-4">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="text-center text-muted-foreground py-8">
                          {t('chat.loading')}
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          {t('chat.empty')}
                        </div>
                      ) : (
                        [...messages].reverse().map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            {msg.profiles?.username ? (
                              <Link href={`/user/${msg.profiles.username}`}>
                                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                  <AvatarImage src={getAvatarUrl(msg.profiles?.avatar_id)} />
                                  <AvatarFallback>
                                    {msg.profiles?.display_name?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                            ) : (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={getAvatarUrl(msg.profiles?.avatar_id)} />
                                <AvatarFallback>
                                  {msg.profiles?.display_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {msg.profiles?.username ? (
                                  <Link href={`/user/${msg.profiles.username}`}>
                                    <span className="font-medium text-sm hover:text-primary transition-colors cursor-pointer">
                                      {msg.profiles?.display_name || 'Unknown'}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="font-medium text-sm">
                                    {msg.profiles?.display_name || 'Unknown'}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-0.5">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {user ? (
                    <form onSubmit={sendMessage} className="flex gap-2 mt-4">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        maxLength={500}
                      />
                      <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center text-muted-foreground py-4 border-t mt-4">
                      {t('chat.loginRequired')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Online Users */}
              <div className="glass-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4" />
                  {t('topListeners.title')}
                </h3>
                <div className="space-y-3">
                  {onlineUsers.slice(0, 10).map((listener, index) => (
                    <Link
                      key={listener.id}
                      href={listener.username ? `/user/${listener.username}` : '#'}
                      className={listener.username ? 'block hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors' : 'block'}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarUrl(listener.avatar_id)} />
                          <AvatarFallback>{listener.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {listener.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {listener.vibes_total.toLocaleString()} Vibes
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Activity Feed Preview */}
              <div className="glass-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t('activity.title')}</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>🎵 Max hat beim Song-Duell abgestimmt</p>
                  <p>🔥 Lisa hat eine 7-Tage-Streak erreicht</p>
                  <p>🏆 Tom hat ein neues Badge erhalten</p>
                  <p>💬 Anna hat eine Nachricht gesendet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
