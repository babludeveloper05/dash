import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/config'

/**
 * Server-side auth helpers — handle the access/refresh token rotation
 * transparently for Next.js API routes that proxy to FastAPI.
 *
 * Why this exists:
 *   The access token expires after 15 min. Without auto-refresh, every
 *   authenticated proxy route would return 401 once the access token expires,
 *   even though a valid (30-day) refresh token is sitting right there in the
 *   cookie jar. This module centralizes the "try access, on 401 refresh and
 *   retry, rotate cookies if refreshed" flow so each route doesn't reinvent it.
 *
 * Token cookies:
 *   delta-token    — access token (15 min maxAge)
 *   delta-refresh  — refresh token (30 day maxAge, httpOnly)
 *
 * Security:
 *   Cookies are marked `Secure` in production (HTTPS only) so they're never
 *   sent over plain HTTP. In dev (localhost HTTP), Secure is omitted so the
 *   cookies actually work.
 */

const ACCESS_COOKIE = 'delta-token'
const REFRESH_COOKIE = 'delta-refresh'
const ACCESS_MAX_AGE = 60 * 15 // 15 min (must match FastAPI ACCESS_TOKEN_EXPIRE_MINUTES)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30 // 30 days (must match FastAPI REFRESH_TOKEN_EXPIRE_DAYS)

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: config.isProduction, // Secure cookies in production (HTTPS only)
}

export interface AuthContext {
  /** The access token to use for the proxied request (may be the original or a freshly refreshed one). */
  accessToken: string | null
  /** The current refresh token (may be rotated). */
  refreshToken: string | null
  /** True if the access token was refreshed during this request. The caller MUST forward the new cookies. */
  refreshed: boolean
}

/**
 * Read the access + refresh tokens from the request cookies.
 */
export function readAuthCookies(req: NextRequest): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: req.cookies.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: req.cookies.get(REFRESH_COOKIE)?.value ?? null,
  }
}

/**
 * Exchange a refresh token for a new access + refresh token pair by calling
 * FastAPI's /api/auth/refresh endpoint. Returns the new pair, or null if the
 * refresh token is invalid/expired (the user must re-authenticate).
 */
async function rotateTokens(refreshToken: string): Promise<{ access: string; refresh: string } | null> {
  try {
    const res = await fetch(`${config.backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token || !data.refresh_token) return null
    return { access: data.access_token, refresh: data.refresh_token }
  } catch {
    return null
  }
}

/**
 * Apply rotated cookies to a NextResponse so the browser stores the new pair.
 * Called when `withAuthRefresh` detected a 401 and successfully refreshed.
 */
export function applyRotatedCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  response.cookies.set(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE })
  response.cookies.set(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_MAX_AGE })
}

/**
 * The core auth-refresh wrapper.
 *
 * `makeRequest` is called with an access token. If it returns 401 AND a refresh
 * token is available, we rotate the tokens and retry once. The returned object
 * tells the caller whether cookies were rotated (so it can forward them on its
 * own response).
 *
 * `makeRequest` should return the raw fetch Response.
 */
export async function withAuthRefresh(
  req: NextRequest,
  makeRequest: (accessToken: string) => Promise<Response>,
): Promise<{ response: Response | null; ctx: AuthContext }> {
  const { accessToken, refreshToken } = readAuthCookies(req)

  if (!accessToken) {
    return { response: null, ctx: { accessToken: null, refreshToken, refreshed: false } }
  }

  // First attempt with the existing access token.
  let response = await makeRequest(accessToken)

  // If the access token is expired/invalid, try to refresh once.
  if (response.status === 401 && refreshToken) {
    const rotated = await rotateTokens(refreshToken)
    if (rotated) {
      // Retry the original request with the fresh access token.
      response = await makeRequest(rotated.access)
      return {
        response,
        ctx: {
          accessToken: rotated.access,
          refreshToken: rotated.refresh,
          refreshed: true,
        },
      }
    }
  }

  return {
    response,
    ctx: { accessToken, refreshToken, refreshed: false },
  }
}

/**
 * Convenience: forward rotated cookies from an AuthContext onto a caller's
 * NextResponse. No-op if no rotation happened.
 */
export function forwardRotatedCookies(response: NextResponse, ctx: AuthContext): void {
  if (ctx.refreshed && ctx.accessToken && ctx.refreshToken) {
    applyRotatedCookies(response, ctx.accessToken, ctx.refreshToken)
  }
}
