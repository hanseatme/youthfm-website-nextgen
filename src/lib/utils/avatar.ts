import { createClient } from '@/lib/supabase/client'

export function getAvatarUrl(avatarId: number | null): string {
  if (!avatarId) {
    return '/avatars/default.svg' // Fallback
  }

  const supabase = createClient()

  // Try to get from storage first
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${avatarId}.png`)

  return data.publicUrl
}

export async function getAvatarUrlByFilePath(filePath: string): Promise<string> {
  const supabase = createClient()

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return data.publicUrl
}
