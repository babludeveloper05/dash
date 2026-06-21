import { config } from "@/config";
import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(`${config.backendUrl}/api/community/leaderboard`)
  const data = await res.json()
  return NextResponse.json(data)
}
