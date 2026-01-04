import { setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

interface LeaderboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: { pathname: '/community', query: { tab: 'leaderboard' } }, locale })
}
