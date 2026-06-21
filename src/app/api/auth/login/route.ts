import { config } from "@/config";
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/login
 * Proxies to FastAPI. Sets the JWT cookie on success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${config.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Invalid credentials' }, { status: res.status })
    }
    const response = NextResponse.json({ user: data.user })
    response.cookies.set('delta-token', data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
