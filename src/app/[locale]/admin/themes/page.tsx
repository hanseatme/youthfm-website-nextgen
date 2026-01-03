'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Wand2, Loader2, Calendar, Image as ImageIcon, Edit, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

interface Theme {
  id: string
  date: string
  title: string
  title_en: string | null
  teaser: string | null
  teaser_en: string | null
  image_url: string | null
  created_at: string
}

export default function AdminThemesPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)

  // Manual form state
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [teaser, setTeaser] = useState('')
  const [teaserEn, setTeaserEn] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_themes')
        .select('*')
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error
      setThemes(data || [])
    } catch (error) {
      console.error('Error loading themes:', error)
      toast.error('Fehler beim Laden der Themen')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateWithAI = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/openai/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      if (!response.ok) {
        throw new Error('Generierung fehlgeschlagen')
      }

      const data = await response.json()
      setTitle(data.title)
      setTitleEn(data.title_en)
      setTeaser(data.teaser)
      setTeaserEn(data.teaser_en)
      setImageUrl(data.image_url || '')

      toast.success('Thema erfolgreich generiert!')
    } catch (error) {
      toast.error('Fehler bei der Generierung')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Ungültiger Dateityp. Nur PNG, JPG und WebP sind erlaubt.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximale Größe ist 5MB.')
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/themes/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fehlgeschlagen')
      }

      const data = await response.json()
      setImageUrl(data.public_url)
      toast.success('Bild erfolgreich hochgeladen!')

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Hochladen')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme)
    setTitle(theme.title)
    setTitleEn(theme.title_en || '')
    setTeaser(theme.teaser || '')
    setTeaserEn(theme.teaser_en || '')
    setImageUrl(theme.image_url || '')
    setDate(theme.date)
    setIsOpen(true)
  }

  const resetForm = () => {
    setTitle('')
    setTitleEn('')
    setTeaser('')
    setTeaserEn('')
    setImageUrl('')
    setDate(new Date().toISOString().split('T')[0])
    setEditingTheme(null)
  }

  const handleSave = async () => {
    if (!title || !date) {
      toast.error('Titel und Datum sind erforderlich')
      return
    }

    try {
      if (editingTheme) {
        // Update existing theme via API
        const response = await fetch('/api/admin/themes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTheme.id,
            date,
            title,
            title_en: titleEn || null,
            teaser: teaser || null,
            teaser_en: teaserEn || null,
            image_url: imageUrl || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Aktualisierung fehlgeschlagen')
        }

        toast.success('Thema aktualisiert!')
      } else {
        // Create new theme
        const response = await fetch('/api/admin/themes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            title,
            title_en: titleEn,
            teaser,
            teaser_en: teaserEn,
            image_url: imageUrl,
          }),
        })

        if (!response.ok) {
          throw new Error('Speichern fehlgeschlagen')
        }

        toast.success('Thema gespeichert!')
      }

      setIsOpen(false)
      resetForm()
      loadThemes()
    } catch (error) {
      toast.error('Fehler beim Speichern')
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Möchtest du dieses Thema wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('daily_themes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Thema gelöscht')
      loadThemes()
    } catch (error) {
      console.error('Error deleting theme:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Themen verwalten</h1>
          <p className="text-muted-foreground">
            Erstelle und verwalte die täglichen Themen
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Thema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTheme ? 'Thema bearbeiten' : 'Neues Thema erstellen'}
              </DialogTitle>
              <DialogDescription>
                {editingTheme
                  ? 'Bearbeite das Thema und speichere deine Änderungen'
                  : 'Erstelle ein neues Thema manuell oder generiere es mit KI'
                }
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="manual" className="mt-4">
              {!editingTheme && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manuell</TabsTrigger>
                  <TabsTrigger value="ai">Mit KI generieren</TabsTrigger>
                </TabsList>
              )}

              {!editingTheme && (
                <TabsContent value="ai" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-date">Datum</Label>
                    <Input
                      id="ai-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Mit GPT-4 generieren
                      </>
                    )}
                  </Button>
                  {title && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{teaser}</p>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel (Deutsch)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Sommerliche Vibes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title-en">Titel (English)</Label>
                    <Input
                      id="title-en"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="Summer Vibes"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teaser">Teaser (Deutsch)</Label>
                    <Textarea
                      id="teaser"
                      value={teaser}
                      onChange={(e) => setTeaser(e.target.value)}
                      placeholder="Beschreibung des Themas..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teaser-en">Teaser (English)</Label>
                    <Textarea
                      id="teaser-en"
                      value={teaserEn}
                      onChange={(e) => setTeaserEn(e.target.value)}
                      placeholder="Theme description..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Themenbild</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="image"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... oder hochladen"
                        className="flex-1"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Upload...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lade ein Bild hoch (max. 5MB) oder verwende eine URL von{' '}
                      <a
                        href="https://unsplash.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Unsplash.com
                      </a>
                    </p>
                    {imageUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = ''
                            toast.error('Bild konnte nicht geladen werden')
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => {
                setIsOpen(false)
                resetForm()
              }}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={!title}>
                {editingTheme ? 'Aktualisieren' : 'Speichern'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Theme Calendar/List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Themen-Kalender
          </CardTitle>
          <CardDescription>
            Übersicht der geplanten und vergangenen Themen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <p>Lade Themen...</p>
            </div>
          ) : themes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Themen vorhanden</p>
              <p className="text-sm">Erstelle dein erstes Thema mit dem Button oben</p>
            </div>
          ) : (
            <div className="space-y-4">
              {themes.map((theme) => {
                const isToday = theme.date === new Date().toISOString().split('T')[0]
                const isFuture = new Date(theme.date) > new Date()

                return (
                  <div
                    key={theme.id}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {theme.image_url && (
                      <div className="relative w-32 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={theme.image_url}
                          alt={theme.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{theme.title}</h3>
                            {isToday && (
                              <Badge variant="default">Heute</Badge>
                            )}
                            {isFuture && (
                              <Badge variant="outline">Geplant</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(theme.date)}
                          </p>
                          {theme.teaser && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {theme.teaser}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(theme)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(theme.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
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
