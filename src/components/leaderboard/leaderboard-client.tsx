'use client'

import { useEffect, useState } from 'react'
import { Trophy, Flame, Sparkles, Medal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'

interface LeaderboardUser {
  id: string
  username: string | null
  display_name: string | null
  location: string | null
  avatar_id: number | null
  vibes_total: number
  streak_current: number
}

interface LeaderboardClientProps {
  users: LeaderboardUser[]
  currentUserId: string | null
  locale: string
  showVibes?: boolean
}

export function LeaderboardClient({ users, currentUserId, locale, showVibes = true }: LeaderboardClientProps) {
  const supabase = createClient()
  const [avatarMap, setAvatarMap] = useState<Record<number, string>>({})

  useEffect(() => {
    const loadAvatars = async () => {
      const avatarIds = Array.from(new Set(users.map((user) => user.avatar_id).filter(Boolean))) as number[]
      if (avatarIds.length === 0) return

      const { data, error } = await supabase
        .from('avatars')
        .select('id, file_path')
        .in('id', avatarIds)

      if (error || !data) return

      const nextMap: Record<number, string> = {}
      data.forEach((avatar: { id: number; file_path: string }) => {
        nextMap[avatar.id] = avatar.file_path
      })
      setAvatarMap(nextMap)
    }

    loadAvatars()
  }, [users])

  function getAvatarUrl(avatarId: number | null) {
    if (!avatarId) return '/avatars/default.svg'
    const filePath = avatarMap[avatarId]
    if (!filePath) return '/avatars/default.svg'
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    return data.publicUrl
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-muted-foreground font-mono">{rank}</span>
  }

  return (
    <div className="space-y-2">
      {users.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {locale === 'de' ? 'Noch keine Daten' : 'No data yet'}
        </p>
      ) : (
        users.map((profile, index) => (
          <Link
            key={profile.id}
            href={profile.username ? `/user/${profile.username}` : '#'}
            className={`flex flex-col gap-3 p-4 rounded-2xl transition-colors sm:flex-row sm:items-center sm:gap-4 ${
              currentUserId === profile.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
            } ${profile.username ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
              <div className="w-8 flex justify-center shrink-0">
                {getRankBadge(index + 1)}
              </div>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={getAvatarUrl(profile.avatar_id)} />
                <AvatarFallback>
                  {profile.display_name?.[0] || profile.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  {profile.display_name || profile.username || 'Anonymous'}
                </div>
                {profile.location && (
                  <div className="text-sm text-muted-foreground truncate">
                    {profile.location}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
              {showVibes ? (
                <div className="flex items-center gap-1 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {profile.vibes_total.toLocaleString()}
                </div>
              ) : (
                <div className="flex items-center gap-1 font-semibold">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {profile.streak_current} {locale === 'de' ? 'Tage' : 'days'}
                </div>
              )}
              {profile.streak_current > 0 && showVibes && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {profile.streak_current}
                </Badge>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
