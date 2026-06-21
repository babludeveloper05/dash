import { config } from "@/config";
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get('subject') || 'All'
  const type = req.nextUrl.searchParams.get('type') || 'All'
  const res = await fetch(`${config.backendUrl}/api/content/tests?subject=${subject}&type=${type}`)
  const data = await res.json()
  return NextResponse.json(data)
}
