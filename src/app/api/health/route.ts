import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Next.js health check — confirms the frontend is alive.
 * The FastAPI backend has its own /health endpoint on port 8000.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'delta-nextjs',
    timestamp: new Date().toISOString(),
  })
}
