'use client'

import { Triangle } from 'lucide-react'

/**
 * Custom 404 page — replaces Next.js default.
 * Shown when a route doesn't exist (shouldn't happen in this SPA, but
 * good practice for production).
 */
export default function NotFound() {
  return (
    <div className="ambient fixed inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="grid place-items-center size-16 rounded-2xl bg-primary/15 text-primary border border-primary/20">
          <Triangle className="size-8 fill-current" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">404</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This page doesn't exist.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:brightness-110 transition-all"
        >
          Go home
        </button>
      </div>
    </div>
  )
}
