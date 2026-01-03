'use client'

import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Avatar {
  id: number
  file_path: string
  file_name: string
  created_at: string
}

export default function AdminAvatarsPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [avatarTier, setAvatarTier] = useState<'standard' | 'premium'>('standard')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAvatars()
  }, [])

  const loadAvatars = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAvatars(data || [])
    } catch (error) {
      console.error('Error loading avatars:', error)
      toast.error('Fehler beim Laden der Avatare')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Ungültiger Dateityp. Nur PNG, JPG und WebP sind erlaubt.')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximale Größe ist 2MB.')
      return
    }

    // Create image to check dimensions
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = async () => {
      // Recommend 256x256 but allow any size
      if (img.width !== 256 || img.height !== 256) {
        toast.warning(`Bild ist ${img.width}x${img.height}px. Empfohlen: 256x256px`)
      }
      URL.revokeObjectURL(img.src)

      await uploadAvatar(file)
    }
  }

  const uploadAvatar = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tier', avatarTier)

      const response = await fetch('/api/admin/avatars/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fehlgeschlagen')
      }

      const data = await response.json()
      toast.success('Avatar erfolgreich hochgeladen!')

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Reload avatars
      loadAvatars()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Hochladen')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (avatar: Avatar) => {
    if (!confirm(`Avatar "${avatar.file_name}" wirklich löschen?`)) return

    try {
      const response = await fetch(`/api/admin/avatars/delete?id=${avatar.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Löschen fehlgeschlagen')
      }

      toast.success('Avatar gelöscht')
      loadAvatars()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen')
    }
  }

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profilbilder verwalten</h1>
        <p className="text-muted-foreground">
          Lade Profilbilder hoch, die User auswählen können
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Neues Profilbild hochladen</CardTitle>
          <CardDescription>
            Empfohlene Größe: 256x256px • Max. 2MB • Formate: PNG, JPG, WebP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Diese Avatare werden allen Usern zur Auswahl angeboten. Stelle sicher, dass sie jugendfrei und angemessen sind.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="avatarTier" className="text-sm text-muted-foreground">
                Tier:
              </label>
              <select
                id="avatarTier"
                value={avatarTier}
                onChange={(e) => setAvatarTier(e.target.value as 'standard' | 'premium')}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Bild auswählen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Avatars Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Profilbilder ({avatars.length})</CardTitle>
          <CardDescription>
            Klicke auf ein Bild für eine Vorschau
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <p>Lade Avatare...</p>
            </div>
          ) : avatars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Avatare hochgeladen</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border hover:border-primary transition-colors"
                >
                  <img
                    src={getPublicUrl(avatar.file_path)}
                    alt={avatar.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(avatar)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">ID: {avatar.id}</p>
                    <p className="text-xs text-white/70 truncate">{avatar.file_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
