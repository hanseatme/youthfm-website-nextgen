'use client'

import { useState, useEffect } from 'react'
import { Flag, Check, X, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  user_id: string
  channel: string
  content: string
  status: string
  created_at: string
  profiles: {
    username: string | null
    display_name: string | null
    avatar_id: number | null
  } | null
}

export default function AdminModerationPage() {
  const [flaggedMessages, setFlaggedMessages] = useState<ChatMessage[]>([])
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)

    // Fetch flagged messages
    const { data: flagged, error: flaggedError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id(username, display_name, avatar_id)
      `)
      .eq('status', 'flagged')
      .order('created_at', { ascending: false })
      .limit(50)

    if (flaggedError) {
      console.error(flaggedError)
    } else {
      setFlaggedMessages(flagged as unknown as ChatMessage[])
    }

    // Fetch recent messages
    const { data: recent, error: recentError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id(username, display_name, avatar_id)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100)

    if (recentError) {
      console.error(recentError)
    } else {
      setRecentMessages(recent as unknown as ChatMessage[])
    }

    setLoading(false)
  }

  const updateMessageStatus = async (messageId: string, newStatus: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: newStatus } as never)
      .eq('id', messageId)

    if (error) {
      toast.error('Fehler beim Aktualisieren')
      console.error(error)
    } else {
      toast.success(
        newStatus === 'active' ? 'Nachricht freigegeben' :
        newStatus === 'deleted' ? 'Nachricht gelöscht' :
        'Status aktualisiert'
      )
      fetchMessages()
    }
  }

  const flagMessage = async (messageId: string) => {
    await updateMessageStatus(messageId, 'flagged')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'main':
        return <Badge variant="outline">Haupt-Chat</Badge>
      case 'duel':
        return <Badge variant="secondary">Duell</Badge>
      case 'theme':
        return <Badge>Thema</Badge>
      case 'studio':
        return <Badge variant="secondary">Studio</Badge>
      default:
        return <Badge variant="outline">{channel}</Badge>
    }
  }

  const MessageCard = ({ message, showActions = true }: { message: ChatMessage; showActions?: boolean }) => (
    <div className="flex gap-4 p-4 rounded-lg border bg-card">
      <Avatar className="h-10 w-10">
        <AvatarImage src={`/avatars/${message.profiles?.avatar_id || 1}.png`} />
        <AvatarFallback>
          {message.profiles?.display_name?.[0] || message.profiles?.username?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {message.profiles?.display_name || message.profiles?.username || 'Unknown'}
          </span>
          {getChannelBadge(message.channel)}
          <span className="text-xs text-muted-foreground">
            {formatDate(message.created_at)}
          </span>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
      {showActions && (
        <div className="flex items-start gap-1">
          {message.status === 'flagged' ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-500 hover:text-green-600"
                onClick={() => updateMessageStatus(message.id, 'active')}
                title="Freigeben"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => updateMessageStatus(message.id, 'deleted')}
                title="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-yellow-500 hover:text-yellow-600"
                onClick={() => flagMessage(message.id)}
                title="Markieren"
              >
                <Flag className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => updateMessageStatus(message.id, 'deleted')}
                title="Löschen"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Moderation</h1>
        <p className="text-muted-foreground">
          Verwalte Chat-Nachrichten und gemeldete Inhalte
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Markierte Nachrichten</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedMessages.length}</div>
            <p className="text-xs text-muted-foreground">
              Warten auf Überprüfung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Nachrichten</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMessages.length}</div>
            <p className="text-xs text-muted-foreground">
              Letzte 100 Nachrichten
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderation</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Aktiv</div>
            <p className="text-xs text-muted-foreground">
              Auto-Filter ist eingeschaltet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <Tabs defaultValue="flagged">
        <TabsList>
          <TabsTrigger value="flagged" className="relative">
            Markiert
            {flaggedMessages.length > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {flaggedMessages.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent">Letzte Nachrichten</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Markierte Nachrichten
              </CardTitle>
              <CardDescription>
                Diese Nachrichten wurden zur Überprüfung markiert
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Laden...</div>
              ) : flaggedMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine markierten Nachrichten</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {flaggedMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Letzte Nachrichten
              </CardTitle>
              <CardDescription>
                Die letzten 100 aktiven Chat-Nachrichten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Laden...</div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Nachrichten vorhanden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
