import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { locales, defaultLocale } from '@/i18n/config'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})

export async function middleware(request: NextRequest) {
  // First, handle Supabase session
  const supabaseResponse = await updateSession(request)

  // If Supabase middleware returned a redirect, use that
  if (supabaseResponse.headers.get('location')) {
    return supabaseResponse
  }

  // Then handle i18n
  const intlResponse = intlMiddleware(request)

  // Merge cookies from Supabase response
  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return intlResponse
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (static files)
    // - _vercel (Vercel internals)
    // - Static files (images, etc.)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
}
