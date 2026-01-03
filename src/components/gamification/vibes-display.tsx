'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flame, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VibesDisplayProps {
  available: number
  streak: number
  multiplier: number
}

interface VibesTransaction {
  id: string
  amount: number
  reason: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export function VibesDisplay({ available, streak, multiplier }: VibesDisplayProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transactions, setTransactions] = useState<VibesTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vibes/transactions')
      if (!response.ok) {
        throw new Error('Failed to load transactions')
      }
      const data = await response.json()
      setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
    } catch (err) {
      console.error('Failed to fetch vibes transactions:', err)
      setError('Vibes-Verlauf konnte nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && transactions.length === 0 && !isLoading) {
      loadTransactions()
    }
  }, [open, transactions.length, isLoading, loadTransactions])

  const formatAmount = (amount: number) => (amount > 0 ? `+${amount}` : `${amount}`)
  const formatDate = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString()
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Vibes */}
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 cursor-default">
              <Sparkles className="h-3 w-3" />
              <span>{available.toLocaleString()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="min-w-[16rem]">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Letzte Vibes
              </p>
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Lade...</p>
              ) : error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine Eintraege.
                </p>
              ) : (
                <div className="space-y-1">
                  {transactions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-foreground">
                        {item.reason}
                      </span>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {formatAmount(item.amount)} · {formatDate(item.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Streak */}
        {streak > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="gap-1 cursor-default border-orange-500/50 text-orange-500"
              >
                <Flame className="h-3 w-3" />
                <span>{streak}</span>
                {multiplier > 1 && (
                  <span className="text-xs text-muted-foreground">
                    x{multiplier}
                  </span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{streak} Tage Streak · x{multiplier} Multiplikator</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
