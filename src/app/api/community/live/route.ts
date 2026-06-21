import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'

/**
 * GET /api/community/live
 * Forwards the access token from the cookie to FastAPI. Auto-refreshes on 401.
 */
export async function GET(req: NextRequest) {
  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/community/live`, {
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
