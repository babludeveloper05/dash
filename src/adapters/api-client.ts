'use client'

import { config } from '@/config'

/**
 * API client — the single entry point for all HTTP requests to the backend.
 *
 * Every feature hook / component calls these functions instead of fetch()
 * directly. This centralizes:
 *  - Error handling (throws ApiError on non-2xx)
 *  - JSON parsing
 *  - URL construction
 *  - Auth (cookies are sent automatically by the browser)
 *  - 401 → refresh → retry (one automatic retry per request)
 *
 * Usage:
 *   const subjects = await api.get('/content/subjects')
 *   const user = await api.post('/auth/login', { email, password })
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Single in-flight refresh promise — concurrent 401s share one refresh.
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      return res.ok
    } catch {
      return false
    } finally {
      // Allow the next refresh attempt after this one settles.
      // Small delay to coalesce bursts.
      setTimeout(() => { refreshPromise = null }, 1000)
    }
  })()
  return refreshPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.apiBase}${path}`

  const doFetch = () => fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  let res = await doFetch()

  // Handle empty responses (204 No Content)
  if (res.status === 204) return undefined as T

  // On 401, attempt a single refresh + retry. The refresh route rotates both
  // httpOnly cookies server-side, so the retry automatically picks them up.
  if (res.status === 401 && !path.startsWith('/auth/refresh')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await doFetch()
      if (res.status === 204) return undefined as T
    }
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string })?.error || `HTTP ${res.status}`,
      data,
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
} as const
