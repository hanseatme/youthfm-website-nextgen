'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Palette, Zap, Crown, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ShopItemCardProps {
  item: {
    id: string
    name: string
    name_en: string | null
    description: string
    description_en: string | null
    cost_vibes: number
    category: string
    stock_limit: number | null
    icon?: string
  }
  userVibes: number
  userId?: string
  isOwned: boolean
  stockRemaining: number | null
  locale: string
  category: string
}

export function ShopItemCard({
  item,
  userVibes,
  userId,
  isOwned,
  stockRemaining,
  locale,
  category,
}: ShopItemCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const router = useRouter()

  const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    influence: Zap,
    personalization: Palette,
    status: Crown,
    extras: Gift,
  }
  const CategoryIcon = categoryIconMap[category] || Gift

  const canAfford = userVibes >= item.cost_vibes
  const isOutOfStock = stockRemaining !== null && stockRemaining <= 0

  const handlePurchase = async () => {
    if (!userId) {
      toast.error(locale === 'de' ? 'Bitte melde dich an' : 'Please log in')
      return
    }

    setIsPurchasing(true)

    try {
      // Call purchase API
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      toast.success(
        locale === 'de'
          ? `${item.name} erfolgreich gekauft!`
          : `${locale === 'en' && item.name_en ? item.name_en : item.name} purchased successfully!`
      )

      // Refresh the page to update vibes count
      router.refresh()
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error(
        locale === 'de'
          ? 'Kauf fehlgeschlagen. Bitte versuche es erneut.'
          : 'Purchase failed. Please try again.'
      )
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className={`glass-card rounded-3xl p-6 ${!canAfford && !isOwned ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {item.icon ? (
              <span className="text-2xl">{item.icon}</span>
            ) : (
              <CategoryIcon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {locale === 'en' && item.name_en ? item.name_en : item.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {item.stock_limit !== null && (
                <Badge variant="secondary" className="text-xs">
                  {isOutOfStock
                    ? (locale === 'de' ? 'Ausverkauft' : 'Sold out')
                    : (locale === 'de' ? 'Limitiert' : 'Limited')}
                </Badge>
              )}
              {stockRemaining !== null && !isOutOfStock && (
                <span className="text-xs text-muted-foreground">
                  {locale === 'de'
                    ? `${stockRemaining} verfuegbar`
                    : `${stockRemaining} left`}
                </span>
              )}
              {isOwned && (
                <Badge variant="outline" className="text-xs">
                  {locale === 'de' ? 'Gekauft' : 'Owned'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {locale === 'en' && item.description_en ? item.description_en : item.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 font-bold text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {item.cost_vibes.toLocaleString()}
        </div>
        <Button
          disabled={!canAfford || !userId || isPurchasing || isOwned || isOutOfStock}
          onClick={handlePurchase}
          size="sm"
        >
          {!userId
            ? (locale === 'de' ? 'Anmelden' : 'Login')
            : isPurchasing
            ? (locale === 'de' ? 'Kaufe...' : 'Purchasing...')
            : isOwned
            ? (locale === 'de' ? 'Gekauft' : 'Owned')
            : isOutOfStock
            ? (locale === 'de' ? 'Ausverkauft' : 'Sold out')
            : !canAfford
            ? (locale === 'de' ? 'Nicht genug Vibes' : 'Not enough vibes')
            : (locale === 'de' ? 'Kaufen' : 'Purchase')}
        </Button>
      </div>
    </div>
  )
}
