import { config } from '@/config'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthRefresh, forwardRotatedCookies } from '@/lib/server-auth'
import { checkCsrf } from '@/lib/csrf'

/**
 * POST /api/sync
 * Proxies to the FastAPI backend with the JWT access token from the httpOnly
 * cookie. The client can't read the cookie directly, so it calls this route
 * which forwards the token as a Bearer header.
 *
 * If the access token is expired (15 min) but a valid refresh token exists,
 * transparently refreshes and retries — so sync keeps working for up to 30
 * days without the user re-authenticating.
 */
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { response, ctx } = await withAuthRefresh(req, async (accessToken) => {
    return fetch(`${config.backendUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })
  })

  if (!response) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Read the body once so we can both inspect status and forward it.
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const out = NextResponse.json(
      { error: (data as { detail?: string })?.detail || 'Sync failed' },
      { status: response.status },
    )
    forwardRotatedCookies(out, ctx)
    return out
  }

  const out = NextResponse.json(data)
  forwardRotatedCookies(out, ctx)
  return out
}
