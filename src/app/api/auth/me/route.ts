import { config } from "@/config";
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/me
 * Reads the JWT from the cookie, verifies with FastAPI, returns the user.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('delta-token')?.value
  if (!token) {
    return NextResponse.json({ user: null })
  }
  try {
    const res = await fetch(`${config.backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return NextResponse.json({ user: null })
    }
    const user = await res.json()
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
