import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'

/**
 * GET /api/content/subjects
 * Forwards the access token from the cookie to FastAPI. Auto-refreshes on 401.
 * Returns 401 if not authenticated — callers (useContent) handle gracefully.
 */
export async function GET(req: NextRequest) {
  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/content/subjects`, {
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
