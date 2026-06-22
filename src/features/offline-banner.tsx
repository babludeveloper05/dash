'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * OfflineBanner — shows a dismissible banner when the browser goes offline.
 *
 * Monitors `navigator.onLine` + the `online`/`offline` window events.
 * The banner appears at the top of the viewport (below the nav) and shows
 * "You're offline — changes will sync when you reconnect."
 *
 * When back online, shows a brief "Back online" confirmation for 3 seconds.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state (SSR-safe — defaults to true)
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)

    const onOnline = () => {
      setOnline(true)
      setWasOffline(true)
      // Clear "was offline" flag after 3s
      window.setTimeout(() => setWasOffline(false), 3000)
    }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Offline — show persistent banner
  if (!online) {
    return (
      <div className="fixed top-16 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-destructive/90 text-destructive-foreground px-4 py-2 text-xs font-medium backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
        <WifiOff className="size-3.5" />
        You're offline — changes will sync when you reconnect.
      </div>
    )
  }

  // Just came back online — show brief confirmation
  if (wasOffline) {
    return (
      <div className="fixed top-16 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-success/90 text-success-foreground px-4 py-2 text-xs font-medium backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
        <Wifi className="size-3.5" />
        Back online — syncing your changes.
      </div>
    )
  }

  return null
}
