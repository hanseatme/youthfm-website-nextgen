'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarDisplayProps {
  avatarId: number | null
  fallback: string
  className?: string
}

export function AvatarDisplay({ avatarId, fallback, className }: AvatarDisplayProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>('/avatars/default.png')
  const supabase = createClient()

  useEffect(() => {
    if (!avatarId) return

    async function fetchAvatarUrl() {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('file_path')
        .eq('id', avatarId)
        .single()

      if (avatar) {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(avatar.file_path)
        setAvatarUrl(data.publicUrl)
      }
    }

    fetchAvatarUrl()
  }, [avatarId])

  return (
    <Avatar className={cn('h-24 w-24', className)}>
      <AvatarImage src={avatarUrl} />
      <AvatarFallback className="text-2xl">
        {fallback}
      </AvatarFallback>
    </Avatar>
  )
}
