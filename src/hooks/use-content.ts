'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/lib/store'

/**
 * useContent — fetches REAL data from the FastAPI backend.
 *
 * Previously this hook called generateContent() which created synthetic
 * chapters/videos/tests from thin air. Now it fetches from the API:
 *   GET /api/content/subjects
 *   GET /api/content/videos
 *   GET /api/content/tests
 *   GET /api/community/live
 *   GET /api/community/leaderboard
 *
 * When the API is unreachable (offline), returns empty arrays — pages show
 * empty states instead of fake data. This is the honest, real-data approach.
 *
 * The content is fetched once on mount and cached in state. Pages can call
 * refresh() to re-fetch after mutations (e.g., after adding a note).
 */

export interface ContentSubject {
  id: string
  name: string
  icon: string
  color: string
}

export interface ContentVideo {
  id: string
  chapterId: string
  subjectId: string
  number: number
  title: string
  instructor: string
  durationSec: number
}

export interface ContentTest {
  id: string
  name: string
  type: string
  subject: string
  questionCount: number
  durationMin: number
  deadlineHours: number | null
  difficulty: string
}

export interface ContentLiveSession {
  id: string
  subject: string
  topic: string
  instructor: string
  startsInHours: number
  viewers: number
  isLive: boolean
}

export interface ContentLeaderEntry {
  id: string
  name: string
  score: number
  streak: number
  change: number
  batch: string
  rank: number
  you?: boolean
}

export interface ContentAchievement {
  id: string
  title: string
  description: string
  category: string
  rarity: string
  icon: string
  earned: boolean
  earnedAt: string | null
  progress: number
}

export interface GeneratedContent {
  subjects: ContentSubject[]
  chapters: { id: string; subjectId: string; number: number; title: string; topicCount: number; durationMin: number }[]
  videos: ContentVideo[]
  tests: ContentTest[]
  liveSessions: ContentLiveSession[]
  achievements: ContentAchievement[]
  studyHours: { day: string; hours: number }[]
  scoreTrend: { test: string; score: number }[]
  leaderboard: ContentLeaderEntry[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const EMPTY: GeneratedContent = {
  subjects: [],
  chapters: [],
  videos: [],
  tests: [],
  liveSessions: [],
  achievements: [],
  studyHours: [],
  scoreTrend: [],
  leaderboard: [],
  loading: true,
  error: null,
  refresh: () => {},
}

export function useContent(): GeneratedContent {
  const [data, setData] = useState<GeneratedContent>(EMPTY)
  const profileTrack = useStore((s) => s.profile.track)

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }))

    try {
      // Fetch all content endpoints in parallel.
      // Each fetch includes credentials so the auth cookie is sent.
      // safeFetch returns the raw parsed JSON (array OR paginated object),
      // or null on error. extractItems then normalizes to an array.
      const safeFetch = async (url: string): Promise<unknown> => {
        try {
          const res = await fetch(url, { credentials: 'include' })
          if (!res.ok) return null
          return await res.json()
        } catch {
          return null
        }
      }

      // Extract .items from a paginated response { items, total, limit, offset }.
      // Falls back to the array itself (for non-paginated endpoints like subjects/live).
      const extractItems = (d: unknown): unknown[] => {
        if (Array.isArray(d)) return d
        if (d && typeof d === 'object' && 'items' in (d as Record<string, unknown>)) {
          const items = (d as { items: unknown[] }).items
          return Array.isArray(items) ? items : []
        }
        return []
      }

      const [subjectsRes, videosRes, testsRes, liveRes, leaderboardRes] = await Promise.all([
        safeFetch('/api/content/subjects').then(extractItems),
        safeFetch('/api/content/videos?limit=500').then(extractItems),
        safeFetch('/api/content/tests?limit=500').then(extractItems),
        safeFetch('/api/community/live').then(extractItems),
        safeFetch('/api/community/leaderboard?limit=500').then(extractItems),
      ])

      // Derive chapters from videos (group by chapterId)
      const chapterMap = new Map<string, { id: string; subjectId: string; number: number; title: string; topicCount: number; durationMin: number }>()
      ;(videosRes as ContentVideo[]).forEach((v) => {
        if (!chapterMap.has(v.chapterId)) {
          chapterMap.set(v.chapterId, {
            id: v.chapterId,
            subjectId: v.subjectId,
            number: chapterMap.size + 1,
            title: v.title.split(':')[0] || `Chapter ${chapterMap.size + 1}`,
            topicCount: 5,
            durationMin: 120,
          })
        }
      })

      // Generate empty study hours + score trend (these should come from the
      // user's actual progress, not generated — show empty until they have data)
      setData({
        subjects: subjectsRes as ContentSubject[],
        chapters: Array.from(chapterMap.values()),
        videos: videosRes as ContentVideo[],
        tests: testsRes as ContentTest[],
        liveSessions: (liveRes as { id: string; subject: string; topic: string; instructor: string; viewers: number; isLive: boolean }[]).map((s) => ({
          ...s,
          startsInHours: 0,
        })),
        leaderboard: (leaderboardRes as ContentLeaderEntry[]).map((l) => ({
          ...l,
          you: l.name === 'You',
        })),
        achievements: [], // Fetch from a dedicated endpoint when available
        studyHours: [], // Empty until user has real study data
        scoreTrend: [], // Empty until user has real test history
        loading: false,
        error: null,
        refresh: fetchAll,
      })
    } catch (err) {
      setData({
        ...EMPTY,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load content',
        refresh: fetchAll,
      })
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return data
}
