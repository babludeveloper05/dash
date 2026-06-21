import { NextRequest, NextResponse } from 'next/server'
import { config as appConfig } from '@/config'

/**
 * Security middleware — HTTPS enforcement + security headers.
 *
 * In production (NODE_ENV=production):
 *   - Redirects HTTP → HTTPS (301 permanent redirect).
 *   - Sets HSTS (Strict-Transport-Security) on HTTPS responses so browsers
 *     never attempt HTTP again for the next 2 years.
 *   - Cookies are marked Secure (via the cookie helpers in server-auth.ts /
 *     auth routes — they read `config.isProduction`).
 *
 * In development:
 *   - No redirect (localhost over HTTP is fine).
 *   - No HSTS (would lock the browser out of localhost HTTP).
 *   - Security headers still applied (defense-in-depth).
 *
 * The middleware runs on every request (page + API + static).
 */

// 2 years + preload. Only sent over HTTPS in production.
const HSTS_MAX_AGE = 63072000

export function middleware(req: NextRequest) {
  const isProduction = appConfig.isProduction
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const isHttps = proto === 'https'

  // --- HTTPS redirect (production only) ---
  if (isProduction && !isHttps) {
    const httpsUrl = new URL(req.nextUrl)
    httpsUrl.protocol = 'https:'
    httpsUrl.port = '' // default 443
    return NextResponse.redirect(httpsUrl, 301)
  }

  // --- Build the response (pass-through) ---
  const res = NextResponse.next()

  // --- HSTS (HTTPS responses, production only) ---
  if (isProduction && isHttps) {
    res.headers.set(
      'Strict-Transport-Security',
      `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`,
    )
  }

  // --- Security headers (all environments) ---
  // These complement the headers set by the Caddy gateway. Setting them here
  // too means they're present even if the app is served directly (not via Caddy).
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  )

  return res
}

export const config = {
  // Run on all routes except Next.js internals (_next/static, _next/image).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
