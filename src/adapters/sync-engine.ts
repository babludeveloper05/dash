'use client'

import { api } from './api-client'
import { useStore } from '@/lib/store'

/**
 * Sync engine — the offline-first push/pull layer.
 *
 * PUSH: reads the full Zustand store state and sends it to the FastAPI
 * backend via POST /api/sync. The server writes each entity (last-write-wins)
 * and returns the merged state.
 *
 * PULL: takes the server's merged response and applies it back to the Zustand
 * store. This is the direction that was previously broken — the old sync hook
 * only pushed and ignored the response.
 *
 * Triggers:
 *  - On mount (app load) — if logged in
 *  - On window 'online' event — re-sync when back online
 *  - Every 60 seconds — periodic background sync
 */

const SYNC_INTERVAL = 60_000

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

/** Check if the user is logged in (by calling /api/auth/me). */
async function isLoggedIn(): Promise<boolean> {
  try {
    const res = await api.get<{ user: unknown | null }>('/auth/me')
    return !!res.user
  } catch {
    return false
  }
}

/** Push the full local state to the server. */
async function pushState(): Promise<SyncResponse | null> {
  const state = useStore.getState()
  const payload = {
    notes: state.notes.map((n) => ({
      id: n.id, title: n.title, subject: n.subject,
      content: n.content, tags: n.tags, updatedAt: n.updatedAt,
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

  return api.post<SyncResponse>('/sync', payload)
}

/** Pull the server's merged state and apply it to the Zustand store. */
function pullState(data: SyncResponse) {
  const state = useStore.getState()

  // Apply profile (only if server has data — don't overwrite with empty)
  if (data.profile && typeof data.profile.name === 'string') {
    state.setProfile({
      name: (data.profile as { name: string }).name,
      location: (data.profile as { location: string }).location || 'Not set',
      bio: (data.profile as { bio: string }).bio || '',
      targetYear: (data.profile as { target_year: string }).target_year || '2027',
      batch: (data.profile as { batch: string }).batch || '',
      examName: (data.profile as { exam_name: string }).exam_name || 'My Goal',
      track: (data.profile as { track: string }).track || 'Student',
      subjects: (data.profile as { subjects: string[] }).subjects || [],
    })
  }

  // Apply appearance
  if (data.appearance) {
    state.setAppearance({
      accentHue: (data.appearance as { accent_hue: number }).accent_hue ?? 62,
      density: (data.appearance as { density: string }).density as 'comfortable' | 'compact' ?? 'comfortable',
      glass: (data.appearance as { glass: string }).glass as 'subtle' | 'medium' | 'strong' ?? 'strong',
    })
  }

  // Apply settings
  if (data.settings) {
    const s = data.settings as {
      enabled_tabs?: string[]; notifications?: Record<string, boolean>;
      daily_goal_hours?: number; custom_countdown_date?: string;
      countdown_label?: string; hours_today?: number; streak?: number;
    }
    if (s.enabled_tabs) state.setEnabledTabs(s.enabled_tabs as never)
    if (s.notifications) state.setNotifications(s.notifications)
    if (s.daily_goal_hours) state.setDailyGoal(s.daily_goal_hours)
    if (s.custom_countdown_date && s.countdown_label) {
      state.setCountdown(s.countdown_label, s.custom_countdown_date)
    }
  }

  // Apply notes (only if server has notes and local is empty — don't overwrite
  // local edits with stale server data on every sync)
  if (data.notes && data.notes.length > 0 && state.notes.length === 0) {
    data.notes.forEach((n) => {
      state.addNote({
        title: n.title,
        subject: n.subject,
        content: n.content,
        tags: n.tags || [],
      })
    })
  }

  // Apply doubts (same — only if local is empty)
  if (data.doubts && data.doubts.length > 0 && state.doubts.length === 0) {
    data.doubts.forEach((d) => {
      const doubtId = state.addDoubt({
        text: d.text,
        subject: d.subject,
        asker: d.asker,
      })
      d.answers.forEach((a) => {
        state.addDoubtAnswer(doubtId, {
          author: (a as { author: string }).author || '',
          role: (a as { role: string }).role as 'AI Tutor' | 'Faculty' | 'Student' || 'AI Tutor',
          text: (a as { text: string }).text || '',
          helpful: (a as { helpful: number }).helpful || 0,
          pending: (a as { pending?: boolean }).pending || false,
          error: (a as { error?: boolean }).error || false,
        })
      })
    })
  }

  // Apply video progress (merge — don't overwrite)
  if (data.video_progress) {
    Object.entries(data.video_progress).forEach(([vid, prog]) => {
      if (!state.videoProgress[vid] || state.videoProgress[vid].fraction < prog.fraction) {
        state.setVideoProgress(vid, prog.fraction)
      }
    })
  }

  console.log('[sync] pulled server data at', data.synced_at)
}

/** Full sync: push local → server, then pull server → local. */
export async function sync(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const loggedIn = await isLoggedIn()
  if (!loggedIn) return // guest mode — no sync

  try {
    const response = await pushState()
    if (response) {
      pullState(response)
    }
  } catch (err) {
    console.warn('[sync] error:', err)
  }
}

/** Hook: useSync — mounts the sync loop. */
export function useSync() {
  useEffect(() => {
    sync()

    const onOnline = () => {
      console.log('[sync] back online — syncing')
      sync()
    }
    window.addEventListener('online', onOnline)

    const timer = setInterval(sync, SYNC_INTERVAL)

    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [])
}

// useEffect is imported at the top of any file that uses useSync
import { useEffect } from 'react'
