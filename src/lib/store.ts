'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type NoteItem,
  type SubjectId,
} from './types'

export type TabId =
  | 'home'
  | 'library'
  | 'tests'
  | 'notes'
  | 'live'
  | 'analytics'
  | 'leaderboard'
  | 'achievements'
  | 'profile'
  | 'settings'
  | 'syllabus'
  | 'doubts'
  | 'playground'

export interface UserProfile {
  name: string
  location: string
  bio: string
  targetYear: string
  batch: string
  examName: string
  /** What the user is here for — e.g. "Software Developer", "JEE Aspirant", "Designer". Drives the AI tutor persona. */
  track: string
  /** Free-form subject/topic list the user is focusing on. Preset-driven, editable. */
  subjects: string[]
}

/** Notification preferences — persisted so toggles survive reloads. */
export interface NotifState {
  live: boolean
  tests: boolean
  streak: boolean
  weekly: boolean
}

/** A single answer on a doubt thread. */
export interface DoubtAnswer {
  id: string
  author: string
  role: 'AI Tutor' | 'Faculty' | 'Student'
  text: string
  hoursAgo: number
  helpful: number
  /** True while the AI is still generating this answer. */
  pending?: boolean
  /** Set if the AI call failed — lets the UI show a retry affordance. */
  error?: boolean
}

export interface DoubtItem {
  id: string
  text: string
  subject: string
  asker: string
  upvotes: number
  hoursAgo: number
  resolved: boolean
  mine: boolean
  answers: DoubtAnswer[]
}

export interface ComponentState {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  z: number
}

export interface VideoProgress {
  fraction: number // 0..1
  completed: boolean
}

export interface HistoryRow {
  id: string
  name: string
  type: string
  subject: string
  daysAgo: number
  score: number
  total: number
  timeTaken: number
  trend: number
}

// --- No mock seed data — the app starts empty and populates from the API
// when the user logs in, or from the content generator for offline/guest mode.

const DEFAULT_COMPONENTS: ComponentState[] = [
  { id: 'w-greeting', type: 'greeting', x: 24, y: 24, w: 1124, h: 96, z: 1 },
  { id: 'w-live', type: 'liveStatus', x: 1164, y: 24, w: 260, h: 96, z: 1 },
  { id: 'w-streak', type: 'streak', x: 24, y: 140, w: 220, h: 224, z: 1 },
  { id: 'w-countdown-class', type: 'nextClass', x: 264, y: 140, w: 280, h: 224, z: 1 },
  { id: 'w-goal', type: 'dailyGoal', x: 564, y: 140, w: 220, h: 224, z: 1 },
  { id: 'w-rings', type: 'subjectRings', x: 804, y: 140, w: 360, h: 224, z: 1 },
  { id: 'w-rank', type: 'batchRank', x: 1184, y: 140, w: 240, h: 224, z: 1 },
  { id: 'w-tests', type: 'testDue', x: 24, y: 384, w: 280, h: 300, z: 1 },
  { id: 'w-notes', type: 'quickNotes', x: 324, y: 384, w: 280, h: 300, z: 1 },
  { id: 'w-leader', type: 'leaderPeek', x: 624, y: 384, w: 260, h: 300, z: 1 },
  { id: 'w-activity', type: 'recentActivity', x: 904, y: 384, w: 260, h: 300, z: 1 },
  { id: 'w-custom', type: 'customCountdown', x: 1184, y: 384, w: 240, h: 300, z: 1 },
]

/**
 * Nav order used for direction calculation. Mirrors the `TABS` array in
 * `top-nav.tsx` so clicking a tab and arrow-keying produce consistent,
 * legible direction. Tabs outside this list (syllabus / doubts / playground —
 * reachable via Spotlight / Settings) default to forward motion.
 */
export const TAB_ORDER: TabId[] = [
  'home', 'library', 'tests', 'notes', 'live', 'analytics',
  'leaderboard', 'achievements', 'profile', 'settings',
]

/** All tab ids available for the user to enable/disable in their nav. */
export const ALL_TABS: TabId[] = [
  'home', 'library', 'tests', 'notes', 'live', 'analytics',
  'leaderboard', 'achievements', 'profile', 'settings',
  'syllabus', 'doubts', 'playground',
]

/** Appearance preferences — persisted so the user's theme survives reloads. */
export interface AppearancePrefs {
  /** Accent color hue in degrees (0–360). Drives --primary, --ring, chart colors. */
  accentHue: number
  /** Layout density. 'comfortable' = more padding; 'compact' = tighter. */
  density: 'comfortable' | 'compact'
  /** Glassmorphism intensity for cards/surfaces. */
  glass: 'strong' | 'medium' | 'subtle'
}

interface DeltaState {
  activeTab: TabId
  /** 1 = forward (right in nav), -1 = backward (left). Drives page transitions. */
  direction: 1 | -1
  setTab: (t: TabId) => void
  cycleTab: (dir: -1 | 1) => void

  /** Tabs the user has enabled in their nav (set during onboarding). Empty = all. */
  enabledTabs: TabId[]
  setEnabledTabs: (tabs: TabId[]) => void

  /** Appearance prefs (accent hue, density, glass). Drives the ThemeVars injector. */
  appearance: AppearancePrefs
  setAppearance: (patch: Partial<AppearancePrefs>) => void

  /** Auth — the logged-in user (null = guest/offline mode). */
  authUser: { id: string; email: string; name: string } | null
  setAuthUser: (u: { id: string; email: string; name: string } | null) => void
  authModalOpen: boolean
  setAuthModalOpen: (v: boolean) => void

  spotlightOpen: boolean
  setSpotlight: (v: boolean) => void

  onboardingDone: boolean
  finishOnboarding: () => void

  // user profile
  profile: UserProfile
  setProfile: (patch: Partial<UserProfile>) => void

  // notification preferences
  notifications: NotifState
  setNotifications: (patch: Partial<NotifState>) => void

  // doubts
  doubts: DoubtItem[]
  addDoubt: (d: { text: string; subject: string; asker: string }) => string
  addDoubtAnswer: (doubtId: string, answer: Omit<DoubtAnswer, 'id' | 'hoursAgo'>) => void
  markDoubtAnswerError: (doubtId: string, answerId: string) => void
  voteDoubt: (doubtId: string) => void
  hasVotedDoubt: (doubtId: string) => boolean
  doubtVotes: Record<string, boolean>

  // progress
  videoProgress: Record<string, VideoProgress>
  setVideoProgress: (id: string, fraction: number) => void
  markVideoComplete: (id: string) => void
  subjectProgress: () => Record<SubjectId, number>
  totalHours: () => number

  // streak / goals
  streak: number
  dailyGoalHours: number
  hoursToday: number
  setDailyGoal: (h: number) => void
  addStudyHours: (h: number) => void
  customCountdownDate: string
  countdownLabel: string
  setCountdown: (label: string, date: string) => void

  // notes
  notes: NoteItem[]
  addNote: (n: Omit<NoteItem, 'id' | 'updatedAt'>) => void
  updateNote: (id: string, n: Partial<NoteItem>) => void
  deleteNote: (id: string) => void
  quickScratch: string
  setQuickScratch: (s: string) => void

  // tests
  history: HistoryRow[]
  submitTest: (row: Omit<HistoryRow, 'id' | 'daysAgo'>) => void

  // components
  components: ComponentState[]
  gridMode: boolean
  setGridMode: (v: boolean) => void
  updateComponent: (id: string, patch: Partial<ComponentState>) => void
  bringToFront: (id: string) => void
  removeComponent: (id: string) => void
  addComponent: (type: string) => void
  resetComponents: () => void

  // video modal / pip
  theaterVideoId: string | null
  pipVideoId: string | null
  openTheater: (id: string) => void
  closeTheater: () => void
  enterPip: () => void
  closePip: () => void
  restoreFromPip: () => void

  // live
  liveAttended: boolean
  setLiveAttended: (v: boolean) => void

  // custom components (user-authored via templates)
  /** Custom component configs: { id, templateId, props } keyed by component id. */
  customComponents: Record<string, { templateId: string; props: Record<string, unknown> }>
  /** Per-instance data for custom components (TODO items, counter values, etc.). */
  customComponentData: Record<string, unknown>
  addCustomComponent: (id: string, templateId: string, props: Record<string, unknown>) => void
  removeCustomComponent: (id: string) => void
  updateCustomComponentProps: (id: string, props: Record<string, unknown>) => void
  setCustomComponentData: (id: string, data: unknown) => void
}

export const useStore = create<DeltaState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      direction: 1,
      setTab: (t) =>
        set((s) => {
          if (t === s.activeTab) return {} // no-op: keep current direction
          const oldIdx = TAB_ORDER.indexOf(s.activeTab)
          const newIdx = TAB_ORDER.indexOf(t)
          // Tabs outside TAB_ORDER (syllabus/doubts/playground) default forward.
          const direction: 1 | -1 =
            oldIdx === -1 || newIdx === -1 ? 1 : newIdx >= oldIdx ? 1 : -1
          return { activeTab: t, direction }
        }),
      cycleTab: (dir) => {
        const i = TAB_ORDER.indexOf(get().activeTab)
        // If the current tab isn't in the nav order (e.g. playground), anchor
        // from home so cycling still lands somewhere sensible.
        const anchor = i === -1 ? 0 : i
        const next = TAB_ORDER[(anchor + dir + TAB_ORDER.length) % TAB_ORDER.length]
        set({ activeTab: next, direction: dir })
      },

      enabledTabs: [],
      setEnabledTabs: (tabs) => set({ enabledTabs: tabs }),

      appearance: { accentHue: 62, density: 'comfortable', glass: 'strong' },
      setAppearance: (patch) =>
        set((s) => ({ appearance: { ...s.appearance, ...patch } })),

      // auth — the logged-in user (null = guest/offline mode). Token is stored
      // separately in localStorage (not persisted by Zustand) so the sync hook
      // can read it without subscribing to the store.
      authUser: null,
      setAuthUser: (u) => set({ authUser: u }),
      authModalOpen: false,
      setAuthModalOpen: (v) => set({ authModalOpen: v }),

      spotlightOpen: false,
      setSpotlight: (v) => set({ spotlightOpen: v }),

      onboardingDone: false,
      finishOnboarding: () => set({ onboardingDone: true }),

      profile: {
        name: 'Aryan Sharma',
        location: 'Kota, Rajasthan',
        bio: 'Aiming for a top rank. Building consistent study habits one day at a time.',
        targetYear: '2027',
        batch: 'Nucleus 2026',
        examName: 'My Exam',
        track: 'Student',
        subjects: ['Physics', 'Chemistry', 'Maths'],
      },
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      notifications: { live: true, tests: true, streak: true, weekly: false },
      setNotifications: (patch) =>
        set((s) => ({ notifications: { ...s.notifications, ...patch } })),

      doubts: [],
      addDoubt: ({ text, subject, asker }) => {
        const id = `doubt-${Date.now()}`
        const newDoubt: DoubtItem = {
          id,
          text,
          subject,
          asker,
          upvotes: 0,
          hoursAgo: 0,
          resolved: false,
          mine: true,
          answers: [],
        }
        set((s) => ({ doubts: [newDoubt, ...s.doubts] }))
        return id
      },
      addDoubtAnswer: (doubtId, answer) =>
        set((s) => ({
          doubts: s.doubts.map((d) =>
            d.id === doubtId
              ? {
                  ...d,
                  resolved: answer.role === 'AI Tutor' ? true : d.resolved,
                  // Drop any pending placeholder so the real answer replaces it
                  // (not appends after it). Errored placeholders stay so the
                  // user can still see/retry them.
                  answers: [
                    ...d.answers.filter((a) => !a.pending),
                    { ...answer, id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, hoursAgo: 0 },
                  ],
                }
              : d
          ),
        })),
      markDoubtAnswerError: (doubtId, answerId) =>
        set((s) => ({
          doubts: s.doubts.map((d) =>
            d.id === doubtId
              ? {
                  ...d,
                  answers: d.answers.map((a) =>
                    a.id === answerId ? { ...a, pending: false, error: true } : a
                  ),
                }
              : d
          ),
        })),
      voteDoubt: (doubtId) =>
        set((s) => {
          const voted = s.doubtVotes?.[doubtId] ?? false
          return {
            doubtVotes: { ...s.doubtVotes, [doubtId]: !voted },
            doubts: s.doubts.map((d) =>
              d.id === doubtId
                ? { ...d, upvotes: d.upvotes + (voted ? -1 : 1) }
                : d
            ),
          }
        }),
      hasVotedDoubt: (doubtId) => !!get().doubtVotes?.[doubtId],

      videoProgress: {},
      setVideoProgress: (id, fraction) =>
        set((s) => ({
          videoProgress: {
            ...s.videoProgress,
            [id]: {
              fraction,
              completed: fraction >= 0.98 || (s.videoProgress[id]?.completed ?? false),
            },
          },
        })),
      markVideoComplete: (id) =>
        set((s) => ({
          videoProgress: { ...s.videoProgress, [id]: { fraction: 1, completed: true } },
          hoursToday: s.hoursToday + 0.5,
        })),
      subjectProgress: () => {
        // Compute from videoProgress — no mock data. Returns a map of
        // videoId-prefix → completion ratio, keyed by subject id prefix.
        const vp = get().videoProgress
        const out: Record<string, number> = {}
        const bySubject: Record<string, { done: number; total: number }> = {}
        Object.entries(vp).forEach(([vid, prog]) => {
          const subjectId = vid.split('-')[0] // e.g. "physics-c1-v1" → "physics"
          if (!bySubject[subjectId]) bySubject[subjectId] = { done: 0, total: 0 }
          bySubject[subjectId].total++
          if (prog.completed) bySubject[subjectId].done++
        })
        Object.entries(bySubject).forEach(([sid, { done, total }]) => {
          out[sid] = total > 0 ? done / total : 0
        })
        return out as Record<SubjectId, number>
      },
      totalHours: () => {
        // Compute from videoProgress — no mock data. Sums fraction × estimated
        // duration (uses a default 40min/video estimate since we don't have the
        // video catalog inline anymore).
        const vp = get().videoProgress
        const ESTIMATED_DURATION_HRS = 40 / 60 // 40 min average
        return Math.round(
          Object.values(vp).reduce((acc, p) => acc + (p.fraction ?? 0) * ESTIMATED_DURATION_HRS, 0)
        )
      },

      streak: 0,
      dailyGoalHours: 6,
      hoursToday: 0,
      customCountdownDate: '2027-01-24',
      countdownLabel: 'Exam Day',
      setDailyGoal: (h) => set({ dailyGoalHours: h }),
      addStudyHours: (h) => set((s) => ({ hoursToday: Math.min(s.dailyGoalHours + 2, s.hoursToday + h) })),
      setCountdown: (label, date) => set({ countdownLabel: label, customCountdownDate: date }),

      notes: [],
      addNote: (n) =>
        set((s) => ({
          notes: [{ ...n, id: `note-${Date.now()}`, updatedAt: Date.now() }, ...s.notes],
        })),
      updateNote: (id, n) =>
        set((s) => ({
          notes: s.notes.map((x) => (x.id === id ? { ...x, ...n, updatedAt: Date.now() } : x)),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((x) => x.id !== id) })),
      quickScratch: '',
      setQuickScratch: (str) => set({ quickScratch: str }),

      history: [],
      submitTest: (row) =>
        set((s) => ({
          history: [{ ...row, id: `hist-${Date.now()}`, daysAgo: 0 }, ...s.history],
        })),

      components: DEFAULT_COMPONENTS,
      gridMode: false,
      setGridMode: (v) => set({ gridMode: v }),
      updateComponent: (id, patch) =>
        set((s) => ({ components: s.components.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      bringToFront: (id) =>
        set((s) => {
          const maxZ = Math.max(...s.components.map((w) => w.z))
          return { components: s.components.map((w) => (w.id === id ? { ...w, z: maxZ + 1 } : w)) }
        }),
      removeComponent: (id) => set((s) => ({ components: s.components.filter((w) => w.id !== id) })),
      addComponent: (type) =>
        set((s) => {
          const maxZ = s.components.length ? Math.max(...s.components.map((w) => w.z)) : 1
          return {
            components: [
              ...s.components,
              { id: `w-${type}-${Date.now()}`, type, x: 80, y: 200, w: 260, h: 220, z: maxZ + 1 },
            ],
          }
        }),
      resetComponents: () => set({ components: DEFAULT_COMPONENTS, gridMode: false }),

      theaterVideoId: null,
      pipVideoId: null,
      openTheater: (id) => set({ theaterVideoId: id, pipVideoId: null }),
      closeTheater: () => set({ theaterVideoId: null }),
      enterPip: () => set((s) => ({ pipVideoId: s.theaterVideoId, theaterVideoId: null })),
      closePip: () => set({ pipVideoId: null }),
      restoreFromPip: () => set((s) => ({ theaterVideoId: s.pipVideoId, pipVideoId: null })),

      liveAttended: false,
      setLiveAttended: (v) => set({ liveAttended: v }),

      customComponents: {},
      customComponentData: {},
      addCustomComponent: (id, templateId, props) =>
        set((s) => ({
          customComponents: { ...s.customComponents, [id]: { templateId, props } },
        })),
      removeCustomComponent: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.customComponents
          const { [id]: __, ...restData } = s.customComponentData
          return { customComponents: rest, customComponentData: restData }
        }),
      updateCustomComponentProps: (id, props) =>
        set((s) => ({
          customComponents: {
            ...s.customComponents,
            [id]: { ...s.customComponents[id], props: { ...s.customComponents[id]?.props, ...props } },
          },
        })),
      setCustomComponentData: (id, data) =>
        set((s) => ({
          customComponentData: { ...s.customComponentData, [id]: data },
        })),

      doubtVotes: {},
    }),
    {
      name: 'project-delta-v1',
      partialize: (s) => ({
        videoProgress: s.videoProgress,
        streak: s.streak,
        dailyGoalHours: s.dailyGoalHours,
        hoursToday: s.hoursToday,
        customCountdownDate: s.customCountdownDate,
        countdownLabel: s.countdownLabel,
        notes: s.notes,
        quickScratch: s.quickScratch,
        history: s.history,
        components: s.components,
        gridMode: s.gridMode,
        onboardingDone: s.onboardingDone,
        liveAttended: s.liveAttended,
        profile: s.profile,
        notifications: s.notifications,
        doubts: s.doubts,
        doubtVotes: s.doubtVotes,
        enabledTabs: s.enabledTabs,
        appearance: s.appearance,
        customComponents: s.customComponents,
        customComponentData: s.customComponentData,
      }),
    }
  )
)

// --- Derived selectors -------------------------------------------------------
// These compute objects/values from state. They must be memoized against the
// underlying `videoProgress` slice; calling the raw store getters inside a
// selector returns a fresh reference each render and triggers an infinite loop.

export function useSubjectProgress(): Record<SubjectId, number> {
  const vp = useStore((s) => s.videoProgress)
  return useMemo(() => useStore.getState().subjectProgress(), [vp])
}

export function useTotalHours(): number {
  const vp = useStore((s) => s.videoProgress)
  return useMemo(() => useStore.getState().totalHours(), [vp])
}
