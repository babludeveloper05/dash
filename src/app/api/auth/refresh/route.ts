import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/config'

/**
 * POST /api/auth/refresh
 * Exchanges the refresh token cookie for a new access + refresh token pair.
 * Called automatically when the access token expires (15 min).
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('delta-refresh')?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  try {
    const res = await fetch(`${config.backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Refresh failed' }, { status: res.status })
    }
    const response = NextResponse.json({ ok: true })
    response.cookies.set('delta-token', data.access_token, {
      httpOnly: true, sameSite: 'lax', maxAge: 60 * 15, path: '/',
    })
    response.cookies.set('delta-refresh', data.refresh_token, {
      httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
