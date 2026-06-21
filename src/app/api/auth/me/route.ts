import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'

/**
 * GET /api/auth/me
 * Reads the JWT access token from the cookie, verifies with FastAPI, returns
 * the user. If the access token is expired (15 min) but a valid refresh token
 * exists, transparently refreshes and retries — so the user stays logged in
 * for up to 30 days without re-authenticating.
 */
export async function GET(req: NextRequest) {
  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  })

  if (!response || !response.ok) {
    // Not authenticated (no token, refresh failed, or user doesn't exist).
    const out = NextResponse.json({ user: null })
    forwardRotatedCookies(out, ctx)
    return out
  }

  try {
    const user = await response.json()
    const out = NextResponse.json({ user })
    forwardRotatedCookies(out, ctx)
    return out
  } catch {
    return NextResponse.json({ user: null })
  }
}
