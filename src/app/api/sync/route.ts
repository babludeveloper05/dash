import { config } from "@/config";
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/sync
 * Proxies to the FastAPI backend (port 8000) with the JWT from the httpOnly cookie.
 * The client can't read the cookie directly, so it calls this route which
 * forwards the token as a Bearer header.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('delta-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const res = await fetch(`${config.backendUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Sync failed' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
