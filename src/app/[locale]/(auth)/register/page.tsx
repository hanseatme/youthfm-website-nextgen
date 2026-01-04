'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Turnstile } from '@/components/auth/turnstile'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [captchaEnabled, setCaptchaEnabled] = useState(false)
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string>('')

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setCaptchaEnabled(Boolean(data?.captcha_enabled))
        setCaptchaSiteKey(typeof data?.captcha_site_key === 'string' ? data.captcha_site_key : null)
      } catch {
        // ignore
      }
    }
    loadSettings()
    return () => {
      active = false
    }
  }, [])

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error(t('errors.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    if (!username.trim()) {
      toast.error('Bitte einen Benutzernamen wählen')
      return
    }

    if (!acceptTerms || !acceptPrivacy) {
      toast.error('Bitte Nutzungsbedingungen und Datenschutz akzeptieren')
      return
    }

    if (captchaEnabled && captchaSiteKey && captchaToken.length < 10) {
      toast.error('Bitte Captcha lösen')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username,
          display_name: displayName,
          first_name: firstName,
          accept_terms: true,
          accept_privacy: true,
          captcha_token: captchaToken,
          locale,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data?.error || 'Registrierung fehlgeschlagen')
        return
      }

      // Optional: sign in immediately (email confirmation might still be required depending on Supabase settings).
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {})

      toast.success('Konto erfolgreich erstellt!')
      router.push(`/${locale}`)
      router.refresh()
    } catch {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('registerTitle')}</CardTitle>
        <CardDescription>{t('registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Anzeigename</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="displayName"
                type="text"
                placeholder="Dein Anzeigename"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Vorname (nicht öffentlich)</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              type="text"
              placeholder="z.B. youthfm_fan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Der Benutzername kann nach der Registrierung nicht mehr geändert werden.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3">
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ich akzeptiere die{' '}
                <Link href="/terms" className="text-primary hover:underline">Nutzungsbedingungen</Link>.
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ich akzeptiere die{' '}
                <Link href="/privacy" className="text-primary hover:underline">Datenschutzerklärung</Link>.
              </span>
            </label>
          </div>

          {captchaEnabled && captchaSiteKey && (
            <Turnstile
              siteKey={captchaSiteKey}
              onToken={handleCaptchaToken}
              onExpire={() => setCaptchaToken('')}
            />
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('registerButton')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <div className="text-sm text-center text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('loginButton')}
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
