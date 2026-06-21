import { config } from "@/config";
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/register
 * Proxies to the FastAPI backend (port 8000) via XTransformPort.
 * Stores the JWT in an httpOnly cookie + returns the user to the client.
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
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
