import { NextRequest, NextResponse } from 'next/server'

/**
 * CSRF protection — Origin header verification.
 *
 * Threat model:
 *   CSRF attacks exploit the fact that browsers automatically attach cookies to
 *   cross-site requests. A malicious site B could POST to site A while the user
 *   is logged in to A, and A's cookies would be sent.
 *
 * Defenses (layered):
 *   1. SameSite=Lax on all auth cookies (already in place) — blocks cross-site
 *      POST/PUT/DELETE from sending cookies. This is the primary defense.
 *   2. Origin header check (this module) — rejects any state-changing request
 *      (POST/PUT/PATCH/DELETE) whose Origin or Referer header doesn't match
 *      the expected origin. Browsers set these headers and they cannot be
 *      spoofed by JavaScript on a different origin. This is defense-in-depth
 *      for browsers that don't support SameSite (very old) or have it disabled.
 *
 * Why not double-submit cookies?
 *   SameSite=Lax already provides the same protection with less complexity.
 *   Double-submit adds a cookie + header check that must stay in sync, and
 *   is vulnerable to sub-domain cookie injection. Origin check is simpler
 *   and equally effective.
 *
 * GET/HEAD/OPTIONS are exempt — they must be idempotent (no state changes).
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * The expected origin for requests to this Next.js app.
 * In production, set CSRF_ALLOWED_ORIGINS to the comma-separated list of
 * allowed origins (e.g. "https://delta.app,https://www.delta.app").
 * In dev, defaults to localhost:3000.
 */
function getAllowedOrigins(): string[] {
  const env = process.env.CSRF_ALLOWED_ORIGINS
  if (env) {
    return env.split(',').map((s) => s.trim()).filter(Boolean)
  }
  // Dev defaults — localhost on common ports.
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
}

/**
 * Extract the origin from a request's Origin or Referer header.
 * Returns null if neither is present (which is suspicious for state-changing
 * requests — browsers always set at least one).
 */
function getRequestOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin')
  if (origin) return origin

  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      return `${url.protocol}//${url.host}`
    } catch {
      return null
    }
  }

  return null
}

/**
 * CSRF check for state-changing requests.
 *
 * Call this at the top of any POST/PUT/PATCH/DELETE route handler:
 *   const csrfError = checkCsrf(req)
 *   if (csrfError) return csrfError
 *
 * For GET/HEAD/OPTIONS, this is a no-op (returns null).
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null

  const requestOrigin = getRequestOrigin(req)
  if (!requestOrigin) {
    // No Origin or Referer header on a state-changing request — reject.
    // Browsers always set at least one for navigations and form submissions.
    // (Note: same-origin fetch from JS always sets Origin.)
    return NextResponse.json(
      { error: 'Missing Origin header' },
      { status: 403 },
    )
  }

  const allowed = getAllowedOrigins()
  if (!allowed.includes(requestOrigin)) {
    return NextResponse.json(
      { error: 'Cross-site request blocked' },
      { status: 403 },
    )
  }

  return null
}
