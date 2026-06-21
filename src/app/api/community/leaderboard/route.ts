import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'

/**
 * GET /api/community/leaderboard
 * Forwards the access token + pagination params (limit, offset) to FastAPI.
 * Auto-refreshes on 401.
 */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit') || '100'
  const offset = req.nextUrl.searchParams.get('offset') || '0'

  const qs = new URLSearchParams({ limit, offset }).toString()

  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/community/leaderboard?${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  })

  if (!response) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  const out = NextResponse.json(data, { status: response.status })
  forwardRotatedCookies(out, ctx)
  return out
}
