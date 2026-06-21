import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'

/**
 * GET /api/content/videos
 * Forwards the access token from the cookie to FastAPI. Auto-refreshes on 401.
 * Supports pagination via limit + offset query params.
 */
export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get('subject') || 'all'
  const limit = req.nextUrl.searchParams.get('limit') || '100'
  const offset = req.nextUrl.searchParams.get('offset') || '0'

  const qs = new URLSearchParams({ subject, limit, offset }).toString()

  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/content/videos?${qs}`, {
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
