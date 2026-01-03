'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Radio, Sparkles, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AppSettings {
  key: string
  value: unknown
  description: string | null
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')

    if (error) {
      toast.error('Fehler beim Laden der Einstellungen')
      console.error(error)
    } else {
      const settingsMap: Record<string, unknown> = {}
      ;(data as AppSettings[]).forEach(item => {
        settingsMap[item.key] = item.value
      })
      setSettings(settingsMap)
    }
    setLoading(false)
  }

  const updateSetting = async (key: string, value: unknown) => {
    setSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'key' })

    if (error) {
      toast.error('Fehler beim Speichern')
      console.error(error)
    } else {
      setSettings(prev => ({ ...prev, [key]: value }))
      toast.success('Einstellung gespeichert')
    }
    setSaving(false)
  }

  const handleToggle = (key: string, current: boolean) => {
    updateSetting(key, !current)
  }

  const handleInputChange = (key: string, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleInputSave = (key: string) => {
    updateSetting(key, settings[key])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere die Plattform-Einstellungen
        </p>
      </div>

      {/* Stream Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Stream-Einstellungen
          </CardTitle>
          <CardDescription>
            Konfiguration für den Radio-Stream
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Stream aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Aktiviert oder deaktiviert den Stream für alle Nutzer
              </p>
            </div>
            <Switch
              checked={settings.stream_enabled as boolean ?? true}
              onCheckedChange={(checked) => updateSetting('stream_enabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="stream_url">Stream URL</Label>
            <div className="flex gap-2">
              <Input
                id="stream_url"
                value={(settings.stream_url as string) || ''}
                onChange={(e) => handleInputChange('stream_url', e.target.value)}
                placeholder="https://stream.example.com/stream"
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('stream_url')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="now_playing_api">Now Playing API URL</Label>
            <div className="flex gap-2">
              <Input
                id="now_playing_api"
                value={(settings.now_playing_api as string) || ''}
                onChange={(e) => handleInputChange('now_playing_api', e.target.value)}
                placeholder="https://api.example.com/nowplaying.json"
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('now_playing_api')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll_interval">Polling-Intervall (ms)</Label>
            <div className="flex gap-2">
              <Input
                id="poll_interval"
                type="number"
                value={(settings.poll_interval as number) || 5000}
                onChange={(e) => handleInputChange('poll_interval', parseInt(e.target.value))}
                min={1000}
                max={60000}
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('poll_interval')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gamification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gamification
          </CardTitle>
          <CardDescription>
            Einstellungen für Vibes, Streaks und Belohnungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Vibes-System aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Ermöglicht das Sammeln und Ausgeben von Vibes
              </p>
            </div>
            <Switch
              checked={settings.vibes_enabled as boolean ?? true}
              onCheckedChange={(checked) => updateSetting('vibes_enabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vibes_per_feedback">Vibes pro Feedback</Label>
              <div className="flex gap-2">
                <Input
                  id="vibes_per_feedback"
                  type="number"
                  value={(settings.vibes_per_feedback as number) || 5}
                  onChange={(e) => handleInputChange('vibes_per_feedback', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <Button
                  variant="outline"
                  onClick={() => handleInputSave('vibes_per_feedback')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vibes_per_feedback_extended">Bonus fuer erweitertes Feedback</Label>
              <div className="flex gap-2">
                <Input
                  id="vibes_per_feedback_extended"
                  type="number"
                  value={(settings.vibes_per_feedback_extended as number) || 9}
                  onChange={(e) => handleInputChange('vibes_per_feedback_extended', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <Button
                  variant="outline"
                  onClick={() => handleInputSave('vibes_per_feedback_extended')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vibes_per_vote">Vibes pro Duell-Vote</Label>
              <div className="flex gap-2">
                <Input
                  id="vibes_per_vote"
                  type="number"
                  value={(settings.vibes_per_vote as number) || 20}
                  onChange={(e) => handleInputChange('vibes_per_vote', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                <Button
                  variant="outline"
                  onClick={() => handleInputSave('vibes_per_vote')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Streak-System aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Ermöglicht das Aufbauen von täglichen Streaks
              </p>
            </div>
            <Switch
              checked={settings.streaks_enabled as boolean ?? true}
              onCheckedChange={(checked) => updateSetting('streaks_enabled', checked)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="streak_threshold_minutes">Min. Hoerminuten fuer Streak</Label>
            <div className="flex gap-2">
              <Input
                id="streak_threshold_minutes"
                type="number"
                value={(settings.streak_threshold_minutes as number) || 10}
                onChange={(e) => handleInputChange('streak_threshold_minutes', parseInt(e.target.value))}
                min={1}
                max={60}
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('streak_threshold_minutes')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Minuten, die ein Nutzer taeglich hoeren muss
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Duel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Duell-Einstellungen
          </CardTitle>
          <CardDescription>
            Konfiguration für Song-Duelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Duelle aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Ermöglicht das Abstimmen bei Song-Duellen
              </p>
            </div>
            <Switch
              checked={settings.duels_enabled as boolean ?? true}
              onCheckedChange={(checked) => updateSetting('duels_enabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="duel_duration_minutes">Duell-Dauer (Minuten)</Label>
            <div className="flex gap-2">
              <Input
                id="duel_duration_minutes"
                type="number"
                value={(settings.duel_duration_minutes as number) || 90}
                onChange={(e) => handleInputChange('duel_duration_minutes', parseInt(e.target.value))}
                min={1}
                max={240}
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('duel_duration_minutes')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duel_frequency_minutes">Duell-Frequenz (Minuten)</Label>
            <div className="flex gap-2">
              <Input
                id="duel_frequency_minutes"
                type="number"
                value={(settings.duel_frequency_minutes as number) || 60}
                onChange={(e) => handleInputChange('duel_frequency_minutes', parseInt(e.target.value))}
                min={10}
                max={240}
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('duel_frequency_minutes')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Moderation
          </CardTitle>
          <CardDescription>
            Einstellungen für Chat und Community-Moderation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Chat aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Aktiviert oder deaktiviert den Live-Chat
              </p>
            </div>
            <Switch
              checked={settings.chat_enabled as boolean ?? true}
              onCheckedChange={(checked) => updateSetting('chat_enabled', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Moderation</Label>
              <p className="text-sm text-muted-foreground">
                Filtert automatisch unangemessene Inhalte
              </p>
            </div>
            <Switch
              checked={settings.auto_moderation as boolean ?? false}
              onCheckedChange={(checked) => updateSetting('auto_moderation', checked)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chat_cooldown">Chat-Cooldown (Sekunden)</Label>
            <div className="flex gap-2">
              <Input
                id="chat_cooldown"
                type="number"
                value={(settings.chat_cooldown as number) || 5}
                onChange={(e) => handleInputChange('chat_cooldown', parseInt(e.target.value))}
                min={0}
                max={60}
              />
              <Button
                variant="outline"
                onClick={() => handleInputSave('chat_cooldown')}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Zeit zwischen Chat-Nachrichten eines Nutzers
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
