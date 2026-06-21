'use client'

import { useEffect, useRef } from 'react'

/**
 * useAuthRefresh — proactively refreshes the access token before it expires.
 *
 * The access token lives 15 min (server-side). We schedule a refresh 1 min
 * before expiry (at 14 min) so the next request always has a valid token.
 * We also refresh when the tab becomes visible again (in case the timer
 * was throttled while backgrounded) and when the network reconnects.
 *
 * The refresh call hits our own /api/auth/refresh route which rotates both
 * cookies server-side. If the refresh fails (refresh token expired/revoked),
 * we silently stop — the next 401 from a proxied route will surface the
 * logged-out state via the normal auth flow.
 *
 * Mounted once in AppShell.
 */

const REFRESH_INTERVAL = 14 * 60 * 1000 // 14 min (1 min before 15-min expiry)
const MIN_REFRESH_GAP = 60 * 1000 // don't refresh more than once a minute

export function useAuthRefresh() {
  const lastRefreshRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    const doRefresh = async (reason: string) => {
      const now = Date.now()
      if (now - lastRefreshRef.current < MIN_REFRESH_GAP) return
      lastRefreshRef.current = now

      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' })
        if (!cancelled) {
          if (res.ok) {
            // Tokens rotated server-side; cookies updated automatically.
          } else if (res.status === 401) {
            // Refresh token invalid/expired — user will be logged out on next
            // authenticated request. Don't spam; pause the timer.
            if (timerRef.current) {
              clearTimeout(timerRef.current)
              timerRef.current = null
            }
          }
        }
      } catch {
        // Network error — will retry on next visibility/timer tick.
      }
    }

    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        doRefresh('timer')
        scheduleNext()
      }, REFRESH_INTERVAL)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Refresh on tab focus (covers the case where the tab was backgrounded
        // long enough for the access token to expire).
        doRefresh('visibility')
      }
    }

    const onOnline = () => doRefresh('online')

    scheduleNext()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [])
}
