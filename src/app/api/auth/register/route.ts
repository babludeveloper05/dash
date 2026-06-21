import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/register
 * Proxies to FastAPI. Sets access + refresh tokens as httpOnly cookies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${config.backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Registration failed' }, { status: res.status })
    }
    const response = NextResponse.json({ user: data.user })
    response.cookies.set('delta-token', data.access_token, {
      httpOnly: true, sameSite: 'lax', maxAge: 60 * 15, path: '/', // 15 min (access token)
    })
    response.cookies.set('delta-refresh', data.refresh_token, {
      httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/', // 30 days (refresh token)
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}

import { config } from '@/config'
