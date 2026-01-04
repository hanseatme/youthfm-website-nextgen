import { setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

interface MessagesPageProps {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ to?: string }>
}

export default async function MessagesPage({ params, searchParams }: MessagesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const sp = await searchParams
  const to = sp?.to

  if (typeof to === 'string' && to.length > 0) {
    redirect({ href: { pathname: '/community', query: { tab: 'messages', to } }, locale })
  }

  redirect({ href: { pathname: '/community', query: { tab: 'messages' } }, locale })
}
