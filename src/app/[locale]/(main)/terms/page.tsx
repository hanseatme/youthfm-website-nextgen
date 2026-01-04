import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('legal_documents')
    .select('title, content, updated_at')
    .eq('slug', 'terms')
    .maybeSingle()

  const title = (data as { title?: string } | null)?.title || 'Nutzungsbedingungen'
  const content = (data as { content?: string } | null)?.content || ''

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto w-full">
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold">{title}</h1>
            <div className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground">
              {content.trim().length > 0 ? content : 'Noch kein Text hinterlegt.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

