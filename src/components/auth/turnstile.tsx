'use client'

import { useEffect, useId, useMemo, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

type TurnstileProps = {
  siteKey: string
  onToken: (token: string) => void
  onExpire?: () => void
}

export function Turnstile({ siteKey, onToken, onExpire }: TurnstileProps) {
  const id = useId()
  const [loaded, setLoaded] = useState(false)

  const scriptId = useMemo(() => `turnstile-script-${id.replace(/[:]/g, '')}`, [id])
  const containerId = useMemo(() => `turnstile-container-${id.replace(/[:]/g, '')}`, [id])

  useEffect(() => {
    const existing = document.getElementById('turnstile-script')
    if (existing) {
      setLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = 'turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [scriptId])

  useEffect(() => {
    if (!loaded) return
    const el = document.getElementById(containerId)
    if (!el) return
    if (!window.turnstile) return

    const widgetId = window.turnstile.render(el, {
      sitekey: siteKey,
      callback: (token: string) => onToken(token),
      'expired-callback': () => onExpire?.(),
      theme: 'auto',
    })

    return () => {
      try {
        window.turnstile?.remove(widgetId)
      } catch {
        // ignore
      }
    }
  }, [loaded, containerId, siteKey, onToken, onExpire])

  if (!siteKey) return null

  return (
    <div className="flex justify-center">
      <div id={containerId} />
    </div>
  )
}

