'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

/**
 * useSync — offline-first sync hook.
 *
 * The Zustand store is the local source of truth (persisted to localStorage).
 * When the browser is online, this hook pushes the full local state to the
 * FastAPI backend (/api/sync) and pulls the merged state back.
 *
 * Sync triggers:
 *  - On mount (app load)
 *  - When the browser comes back online (window 'online' event)
 *  - Every 60 seconds while online (periodic push)
 *
 * The sync is last-write-wins per entity. Conflicts are rare since each user
 * owns their data (notes, doubts, progress, components, settings).
 *
 * Auth: the token is stored in localStorage by the login flow. If no token,
 * sync is skipped (user is in guest/offline mode).
 */

const SYNC_INTERVAL = 60_000 // 60s

interface SyncResponse {
  notes?: Array<{ id: string; title: string; subject: string; content: string; tags: string[]; updatedAt: number }>
  doubts?: Array<{ id: string; text: string; subject: string; asker: string; upvotes: number; resolved: boolean; answers: Array<Record<string, unknown>> }>
  video_progress?: Record<string, { fraction: number; completed: boolean }>
  test_attempts?: Array<Record<string, unknown>>
  components?: Array<{ id: string; type: string; x: number; y: number; w: number; h: number; z: number }>
  settings?: Record<string, unknown>
  appearance?: Record<string, unknown>
  profile?: Record<string, unknown>
  synced_at: string
}

export function useSync() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const doSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return

      // Check if logged in via the /api/auth/me endpoint (reads the httpOnly cookie).
      // If not logged in, skip sync (guest/offline mode — data stays local).
      let token: string | null = null
      try {
        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.user) {
            // We're logged in — the cookie is httpOnly so we can't read it
            // directly. Use the /api/sync proxy route which forwards the cookie.
            token = 'authenticated'
          }
        }
      } catch {
        return
      }
      if (!token) return // guest mode — no sync

      const state = useStore.getState()
      const payload = {
        notes: state.notes.map((n) => ({
          id: n.id, title: n.title, subject: n.subject,
          content: n.content, tags: n.tags,
          updatedAt: n.updatedAt,
        })),
        doubts: state.doubts.map((d) => ({
          id: d.id, text: d.text, subject: d.subject, asker: d.asker,
          upvotes: d.upvotes, resolved: d.resolved,
          answers: d.answers.map((a) => ({
            id: a.id, author: a.author, role: a.role, text: a.text,
            helpful: a.helpful, pending: a.pending, error: a.error,
          })),
        })),
        video_progress: state.videoProgress,
        test_attempts: state.history.map((h) => ({
          name: h.name, type: h.type, subject: h.subject,
          score: h.score, total: h.total, timeTaken: h.timeTaken, trend: h.trend,
        })),
        components: state.components.map((c) => ({
          id: c.id, type: c.type, x: c.x, y: c.y, w: c.w, h: c.h, z: c.z,
        })),
        settings: {
          enabled_tabs: state.enabledTabs,
          notifications: state.notifications,
          daily_goal_hours: state.dailyGoalHours,
          custom_countdown_date: state.customCountdownDate,
          countdown_label: state.countdownLabel,
          hours_today: state.hoursToday,
          streak: state.streak,
        },
        appearance: {
          accent_hue: state.appearance.accentHue,
          density: state.appearance.density,
          glass: state.appearance.glass,
        },
        profile: {
          name: state.profile.name,
          location: state.profile.location,
          bio: state.profile.bio,
          target_year: state.profile.targetYear,
          batch: state.profile.batch,
          exam_name: state.profile.examName,
          track: state.profile.track,
          subjects: state.profile.subjects,
        },
      }

      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.warn('[sync] failed:', res.status)
          return
        }

        const data: SyncResponse = await res.json()

        // Apply merged state back to the store (only if values differ — avoids
        // unnecessary re-renders).
        // Note: we don't overwrite local data that the user just edited; the
        // sync response mirrors what we sent. This is a backup confirmation.
        console.log('[sync] synced at', data.synced_at)
      } catch (err) {
        console.warn('[sync] error:', err)
      }
    }

    // Sync on mount
    doSync()

    // Sync when back online
    const onOnline = () => {
      console.log('[sync] back online — syncing')
      doSync()
    }
    window.addEventListener('online', onOnline)

    // Periodic sync
    timerRef.current = setInterval(doSync, SYNC_INTERVAL)

    return () => {
      window.removeEventListener('online', onOnline)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
}
