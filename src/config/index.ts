/**
 * Centralized configuration — read once at startup.
 *
 * NO other file in src/ may access process.env directly.
 * Everything imports from here.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
const REALTIME_PORT = process.env.NEXT_PUBLIC_REALTIME_PORT || '3003'

export const config = {
  /** FastAPI backend URL (server-side only — used in API route proxies). */
  backendUrl: BACKEND_URL,
  /** Socket.io port (exposed to client via NEXT_PUBLIC_). */
  realtimePort: REALTIME_PORT,
  /** Whether we're in production. */
  isProduction: process.env.NODE_ENV === 'production',
  /** API base path for client-side fetches (goes through Next.js proxy routes). */
  apiBase: '/api',
} as const

export type Config = typeof config
