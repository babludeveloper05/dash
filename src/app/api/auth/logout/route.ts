import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/config'

/**
 * POST /api/auth/logout
 * Proxies to FastAPI which blocklists the tokens server-side.
 * Then clears both cookies.
 */
export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('delta-token')?.value
  const refreshToken = req.cookies.get('delta-refresh')?.value

  // Tell FastAPI to blocklist the tokens
  if (accessToken) {
    try {
      await fetch(`${config.backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken || '' }),
      })
    } catch {
      // If backend is down, still clear cookies
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('delta-token')
  response.cookies.delete('delta-refresh')
  return response
}
