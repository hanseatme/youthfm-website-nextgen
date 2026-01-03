'use client'

import { useState, useEffect } from 'react'
import { Plus, Play, Pause, Trophy, Clock, Swords, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Song {
  id: string
  title: string
  artist: string | null
  artwork_url: string | null
}

interface Duel {
  id: string
  duel_type: string
  status: string
  votes_a: number
  votes_b: number
  started_at: string | null
  ended_at: string | null
  created_at: string
  prompt?: string | null
  option_a_text?: string | null
  option_b_text?: string | null
  song_a: Song | null
  song_b: Song | null
}

export default function AdminDuelsPage() {
  const [duels, setDuels] = useState<Duel[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [syncingSongs, setSyncingSongs] = useState(false)
  const [selectedSongA, setSelectedSongA] = useState<string>('')
  const [selectedSongB, setSelectedSongB] = useState<string>('')
  const [duelType, setDuelType] = useState<string>('classic')
  const [duelPrompt, setDuelPrompt] = useState('')
  const [optionAText, setOptionAText] = useState('')
  const [optionBText, setOptionBText] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchDuels()
    fetchSongs()
  }, [])

  const fetchDuels = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('duels')
      .select(`
        *,
        song_a:songs!duels_song_a_id_fkey(id, title, artist, artwork_url),
        song_b:songs!duels_song_b_id_fkey(id, title, artist, artwork_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast.error('Fehler beim Laden der Duelle')
      console.error(error)
    } else {
      setDuels(data as unknown as Duel[])
    }
    setLoading(false)
  }

  const fetchSongs = async () => {
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist, artwork_url, track_id')
      .eq('is_active', true)
      .not('track_id', 'is', null)
      .order('title')
      .limit(500)

    if (error) {
      console.error(error)
    } else {
      setSongs(data as Song[])
    }
  }

  const syncSongsFromStreamserver = async () => {
    setSyncingSongs(true)
    try {
      const response = await fetch('/api/admin/music/sync', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data?.error || 'Fehler beim Synchronisieren der Songs')
        return
      }
      toast.success(`Songs synchronisiert: ${data?.synced ?? 0}`)
      fetchSongs()
    } catch (error) {
      console.error(error)
      toast.error('Fehler beim Synchronisieren der Songs')
    } finally {
      setSyncingSongs(false)
    }
  }

    const createDuel = async () => {
    const isTextDuel = duelType === 'text'
    if (isTextDuel) {
      if (!optionAText.trim() || !optionBText.trim()) {
        toast.error('Bitte beide Optionen eingeben')
        return
      }
    } else {
      if (!selectedSongA || !selectedSongB) {
        toast.error('Bitte wähle zwei Songs aus')
        return
      }

      if (selectedSongA === selectedSongB) {
        toast.error('Die Songs müssen unterschiedlich sein')
        return
      }
    }

    const { error } = await supabase.from('duels').insert({
      song_a_id: isTextDuel ? null : selectedSongA,
      song_b_id: isTextDuel ? null : selectedSongB,
      prompt: isTextDuel ? (duelPrompt.trim() || null) : null,
      option_a_text: isTextDuel ? optionAText.trim() : null,
      option_b_text: isTextDuel ? optionBText.trim() : null,
      duel_type: duelType as 'classic' | 'comeback' | 'newbie' | 'community' | 'text',
      status: 'scheduled' as const,
    } as never)

    if (error) {
      toast.error('Fehler beim Erstellen')
      console.error(error)
    } else {
      toast.success('Duell erstellt!')
      setIsOpen(false)
      setSelectedSongA('')
      setSelectedSongB('')
      setDuelPrompt('')
      setOptionAText('')
      setOptionBText('')
      fetchDuels()
    }
  }

  const updateDuelStatus = async (duelId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'active') {
      updates.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.ended_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('duels')
      .update(updates as never)
      .eq('id', duelId)

    if (error) {
      toast.error('Fehler beim Aktualisieren')
    } else {
      toast.success('Duell aktualisiert')
      fetchDuels()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktiv</Badge>
      case 'completed':
        return <Badge variant="secondary">Beendet</Badge>
      case 'scheduled':
        return <Badge variant="outline">Geplant</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Abgebrochen</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getDuelTypeLabel = (type: string) => {
    switch (type) {
      case 'classic': return 'Klassisch'
      case 'comeback': return 'Comeback'
      case 'newbie': return 'Newcomer'
      case 'community': return 'Community'
      case 'text': return 'Freitext'
      default: return type
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Duelle verwalten</h1>
          <p className="text-muted-foreground">
            Erstelle und verwalte Song-Duelle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={syncSongsFromStreamserver} disabled={syncingSongs}>
            <RefreshCw className={syncingSongs ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Songs sync
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neues Duell
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Duell erstellen</DialogTitle>
              <DialogDescription>
                Wähle zwei Songs für das Duell aus
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Duell-Typ</Label>
                <Select value={duelType} onValueChange={setDuelType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Klassisch</SelectItem>
                    <SelectItem value="comeback">Comeback</SelectItem>
                    <SelectItem value="newbie">Newcomer</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="text">Freitext</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {duelType === 'text' ? (
                <>
                  <div className="space-y-2">
                    <Label>Frage (optional)</Label>
                    <input
                      value={duelPrompt}
                      onChange={(e) => setDuelPrompt(e.target.value)}
                      placeholder="z.B. Kaffee oder Tee?"
                      className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option A</Label>
                    <input
                      value={optionAText}
                      onChange={(e) => setOptionAText(e.target.value)}
                      placeholder="z.B. Kaffee"
                      className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Option B</Label>
                    <input
                      value={optionBText}
                      onChange={(e) => setOptionBText(e.target.value)}
                      placeholder="z.B. Tee"
                      className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Song A</Label>
                    <Select value={selectedSongA} onValueChange={setSelectedSongA}>
                      <SelectTrigger>
                        <SelectValue placeholder="Song auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {songs.map((song) => (
                          <SelectItem key={song.id} value={song.id}>
                            {song.artist ? `${song.artist} - ${song.title}` : song.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center">
                    <Swords className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="space-y-2">
                    <Label>Song B</Label>
                    <Select value={selectedSongB} onValueChange={setSelectedSongB}>
                      <SelectTrigger>
                        <SelectValue placeholder="Song auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {songs.map((song) => (
                          <SelectItem key={song.id} value={song.id}>
                            {song.artist ? `${song.artist} - ${song.title}` : song.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={createDuel}>
                  Erstellen
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Duel */}
      {duels.find(d => d.status === 'active') && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <CardTitle>Aktives Duell</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeDuel = duels.find(d => d.status === 'active')!
              const totalVotes = activeDuel.votes_a + activeDuel.votes_b
              const percentA = totalVotes > 0 ? (activeDuel.votes_a / totalVotes) * 100 : 50
              const optionATitle = activeDuel.option_a_text || activeDuel.song_a?.title || 'Unknown'
              const optionBTitle = activeDuel.option_b_text || activeDuel.song_b?.title || 'Unknown'
              const optionASubtitle = activeDuel.option_a_text ? null : (activeDuel.song_a?.artist || '-')
              const optionBSubtitle = activeDuel.option_b_text ? null : (activeDuel.song_b?.artist || '-')

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="font-semibold">
                        {optionATitle}
                      </p>
                      {optionASubtitle && (
                        <p className="text-sm text-muted-foreground">
                          {optionASubtitle}
                        </p>
                      )}
                      <p className="text-2xl font-bold mt-2">{activeDuel.votes_a}</p>
                    </div>
                    <div className="px-4">
                      <Swords className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-semibold">
                        {optionBTitle}
                      </p>
                      {optionBSubtitle && (
                        <p className="text-sm text-muted-foreground">
                          {optionBSubtitle}
                        </p>
                      )}
                      <p className="text-2xl font-bold mt-2">{activeDuel.votes_b}</p>
                    </div>
                  </div>
                  <Progress value={percentA} className="h-3" />
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => updateDuelStatus(activeDuel.id, 'completed')}
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      Beenden
                    </Button>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Duels List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alle Duelle
          </CardTitle>
          <CardDescription>
            {duels.length} Duelle insgesamt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Laden...</div>
          ) : duels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Noch keine Duelle erstellt
            </div>
          ) : (
            <div className="space-y-4">
              {duels.map((duel) => {
                const totalVotes = duel.votes_a + duel.votes_b
                const percentA = totalVotes > 0 ? (duel.votes_a / totalVotes) * 100 : 50

                return (
                  <div
                    key={duel.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(duel.status)}
                        <Badge variant="outline">{getDuelTypeLabel(duel.duel_type)}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(duel.created_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                      <div>
                        <p className="font-medium truncate">
                          {duel.option_a_text || duel.song_a?.title || 'Unknown'}
                        </p>
                        {!duel.option_a_text && (
                          <p className="text-sm text-muted-foreground truncate">
                            {duel.song_a?.artist || '-'}
                          </p>
                        )}
                      </div>
                      <div className="text-center font-mono">
                        {duel.votes_a} : {duel.votes_b}
                      </div>
                      <div className="text-right">
                        <p className="font-medium truncate">
                          {duel.option_b_text || duel.song_b?.title || 'Unknown'}
                        </p>
                        {!duel.option_b_text && (
                          <p className="text-sm text-muted-foreground truncate">
                            {duel.song_b?.artist || '-'}
                          </p>
                        )}
                      </div>
                    </div>

                    {totalVotes > 0 && (
                      <Progress value={percentA} className="h-1 mt-3" />
                    )}

                    {duel.status === 'scheduled' && (
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => updateDuelStatus(duel.id, 'active')}
                        >
                          <Play className="mr-2 h-3 w-3" />
                          Starten
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


