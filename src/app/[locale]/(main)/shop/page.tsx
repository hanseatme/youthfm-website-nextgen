import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Sparkles, Palette, Zap, Crown, Gift } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import { ShopItemCard } from '@/components/shop/shop-item-card'
import type { Tables } from '@/types/database'

interface ShopPageProps {
  params: Promise<{ locale: string }>
}

type ShopItem = Tables<'shop_items'>

const CATEGORY_ICONS = {
  influence: Zap,
  personalization: Palette,
  status: Crown,
  extras: Gift,
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('shop')

  const supabase = await createClient()

  // Fetch current user's vibes
  const { data: { user } } = await supabase.auth.getUser()
  let userVibes = 0

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('vibes_available')
      .eq('id', user.id)
      .single()

    userVibes = (profile as { vibes_available: number } | null)?.vibes_available || 0
  }

  // Fetch shop items
  const { data: shopItems } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_available', true)
    .order('cost_vibes', { ascending: true })

  const items = (shopItems || []) as ShopItem[]

  const purchasedItemIds = new Set<string>()
  if (user) {
    const { data: purchases } = await supabase
      .from('user_purchases')
      .select('item_id')
      .eq('user_id', user.id)

    purchases?.forEach((purchase) => {
      purchasedItemIds.add((purchase as { item_id: string }).item_id)
    })
  }

  const limitedItems = items.filter((item) => item.stock_limit !== null)
  const stockRemainingMap: Record<string, number | null> = {}
  await Promise.all(
    limitedItems.map(async (item) => {
      const { count } = await supabase
        .from('user_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', item.id)
      const remaining = Math.max(0, (item.stock_limit || 0) - (count || 0))
      stockRemainingMap[item.id] = remaining
    })
  )

  const categories = ['influence', 'personalization', 'status', 'extras'] as const

  const isRepeatable = (item: ShopItem) =>
    Boolean((item.metadata as { repeatable?: boolean } | null)?.repeatable)

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground">
                {locale === 'de'
                  ? 'Tausche deine Vibes gegen tolle Belohnungen'
                  : 'Exchange your vibes for awesome rewards'}
              </p>
            </div>
            {user && (
              <div className="glass-card rounded-2xl px-6 py-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{userVibes.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === 'de' ? 'Verfügbare Vibes' : 'Available Vibes'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                {locale === 'de' ? 'Alle' : 'All'}
              </TabsTrigger>
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category]
                return (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    {t(`categories.${category}`)}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {items.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {locale === 'de'
                      ? 'Noch keine Artikel verfügbar'
                      : 'No items available yet'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      userVibes={userVibes}
                      userId={user?.id}
                      isOwned={!isRepeatable(item) && purchasedItemIds.has(item.id)}
                      stockRemaining={item.stock_limit !== null ? (stockRemainingMap[item.id] ?? 0) : null}
                      locale={locale}
                      category={item.category}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-6">
                {items.filter(item => item.category === category).length === 0 ? (
                  <div className="glass-card rounded-3xl p-12 text-center">
                    <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {locale === 'de'
                        ? 'Keine Artikel in dieser Kategorie'
                        : 'No items in this category'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {items
                      .filter(item => item.category === category)
                      .map((item) => (
                        <ShopItemCard
                          key={item.id}
                          item={item}
                          userVibes={userVibes}
                          userId={user?.id}
                          isOwned={!isRepeatable(item) && purchasedItemIds.has(item.id)}
                          stockRemaining={item.stock_limit !== null ? (stockRemainingMap[item.id] ?? 0) : null}
                          locale={locale}
                          category={item.category}
                        />
                      ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
