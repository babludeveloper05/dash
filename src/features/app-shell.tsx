'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useStore } from '@/lib/store'
import { TopNav } from './top-nav'
import { Spotlight } from './spotlight'
import { Onboarding } from './onboarding/onboarding'
import { VideoLayer } from './content/video-player'
import { ThemeVars } from '@/shared/theme-vars'
import { AuthModal } from './auth/auth-modal'
import { OfflineBanner } from './offline-banner'
import { useSync } from '@/adapters/sync-engine'
import { useRealtime } from '@/lib/realtime'
import { useAuthRefresh } from '@/hooks/use-auth-refresh'
import { HomePage } from './home-page'
import { LibraryPage } from './pages/library'
import { TestsPage } from './pages/tests'
import { NotesPage } from './pages/notes'
import { LivePage } from './pages/live'
import { AnalyticsPage } from './pages/analytics'
import { LeaderboardPage } from './pages/leaderboard'
import { AchievementsPage } from './pages/achievements'
import { ProfilePage } from './pages/profile'
import { SettingsPage } from './pages/settings'
import { SyllabusPage } from './pages/syllabus'
import { DoubtsPage } from './pages/doubts'
import { PlaygroundPage } from './pages/playground'
import { Triangle } from 'lucide-react'
import {
  pageVariants,
  parallaxBgVariants,
  pageTransition,
  type PageTransitionCtx,
} from '@/lib/motion'

function ActivePage() {
  const tab = useStore((s) => s.activeTab)
  switch (tab) {
    case 'home': return <HomePage />
    case 'library': return <LibraryPage />
    case 'tests': return <TestsPage />
    case 'notes': return <NotesPage />
    case 'live': return <LivePage />
    case 'analytics': return <AnalyticsPage />
    case 'leaderboard': return <LeaderboardPage />
    case 'achievements': return <AchievementsPage />
    case 'profile': return <ProfilePage />
    case 'settings': return <SettingsPage />
    case 'syllabus': return <SyllabusPage />
    case 'doubts': return <DoubtsPage />
    case 'playground': return <PlaygroundPage />
    default: return <HomePage />
  }
}

export function AppShell() {
  const cycleTab = useStore((s) => s.cycleTab)
  const activeTab = useStore((s) => s.activeTab)
  const direction = useStore((s) => s.direction)
  const spotlightOpen = useStore((s) => s.spotlightOpen)
  const theaterVideoId = useStore((s) => s.theaterVideoId)
  const prefersReduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Offline-first sync + real-time socket.io connection.
  // Sync pushes/pulls to the FastAPI backend when online.
  // Realtime connects to the socket.io service for live updates.
  useSync()
  useRealtime()
  // Proactively refresh the access token before it expires (every 14 min),
  // plus on tab focus / reconnect — keeps the user logged in for up to 30
  // days without re-authenticating.
  useAuthRefresh()

  // On mount, check if the user is logged in (reads the httpOnly cookie via
  // the /api/auth/me proxy). If logged in, populate authUser so the nav shows
  // the user's name + sign-out button instead of the sign-in button.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          useStore.getState().setAuthUser(data.user)
          // Apply the synced profile if present
          if (data.user.name) {
            useStore.getState().setProfile({ name: data.user.name })
          }
        }
      })
      .catch(() => {/* offline — stay in guest mode */})
  }, [])

  // Scroll progress for the parallax progress bar. Tracks the main scroll
  // container via a manual listener (SSR-safe — framer-motion's useScroll
  // with a container ref has timing issues during hydration). The motion
  // value is spring-smoothed so the bar glides rather than jumps.
  const mainRef = useRef<HTMLElement>(null)
  const scrollProgress = useMotionValue(0)
  const progressScaleX = useSpring(scrollProgress, {
    stiffness: 200,
    damping: 40,
    restDelta: 0.001,
  })
  // Parallax drift for the ambient glow during scroll — shifts at a fraction
  // of the scroll progress so the background appears to lag behind content.
  const bgScrollY = useTransform(progressScaleX, [0, 1], [0, prefersReduced ? 0 : 60])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      scrollProgress.set(max > 0 ? el.scrollTop / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollProgress, activeTab])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing =
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)
      if (typing || spotlightOpen || theaterVideoId) return
      if (e.key === 'ArrowRight') cycleTab(1)
      if (e.key === 'ArrowLeft') cycleTab(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cycleTab, spotlightOpen, theaterVideoId])

  if (!mounted) {
    return (
      <div className="ambient fixed inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="grid place-items-center size-12 rounded-2xl bg-primary text-primary-foreground elev-2">
            <Triangle className="size-6 fill-current" />
          </span>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.2s]" />
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.1s]" />
            <span className="size-1.5 rounded-full bg-primary/60 animate-bounce" />
          </div>
        </div>
      </div>
    )
  }

  // Direction + reduced-motion context shared by both the entering and the
  // exiting page so the sweep is continuous (no dead frame between them).
  const ctx: PageTransitionCtx = { dir: direction, reduce: prefersReduced ?? false }

  return (
    <div className="ambient fixed inset-0 flex flex-col">
      <ThemeVars />
      {/* Scroll progress bar — springs along the top of the content area.
          Parallax-adjacent: visualises how far through the page you've scrolled. */}
      <motion.div
        className="absolute top-16 left-0 right-0 h-[2px] bg-primary/70 origin-left z-40 pointer-events-none"
        style={{ scaleX: progressScaleX }}
        aria-hidden
      />
      {/* Scroll parallax ambient glow — drifts downward as you scroll so the
          background reads as a deeper layer behind the content. */}
      <motion.div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          y: bgScrollY,
          background:
            'radial-gradient(80% 50% at 20% 10%, oklch(0.32 0.04 60 / 0.18) 0%, transparent 60%), radial-gradient(60% 40% at 85% 90%, oklch(0.28 0.03 55 / 0.14) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <TopNav />
      <OfflineBanner />
      {/*
        3D perspective container — wraps AnimatePresence so translateZ on the
        pages creates real depth (the camera-move effect). perspective: 1200px
        gives a natural focal length; perspective-origin centered so the
        receding page shrinks toward the middle of the viewport. The inner
        motion.main elements carry transformStyle: preserve-3d so they
        participate in the 3D space.

        Axis model (per the brief):
          X (depth, front/back)  → translateZ  — camera moves back here
          Y (sideways)           → translateX  — directional parallax
          Z (top/bottom)         → translateY  — vertical drift
      */}
      <div
        className="absolute inset-x-0 bottom-0 top-16"
        style={{ perspective: 1200, perspectiveOrigin: 'center center' }}
      >
        <AnimatePresence custom={ctx} initial={false}>
          <motion.div
            key={`bg-${activeTab}`}
            custom={ctx}
            variants={parallaxBgVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition(ctx.reduce)}
            className="absolute inset-0 pointer-events-none"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
            aria-hidden
          />
          <motion.main
            ref={mainRef}
            key={activeTab}
            custom={ctx}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition(ctx.reduce)}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-thin"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            <ActivePage />
          </motion.main>
        </AnimatePresence>
      </div>
      <Spotlight />
      <Onboarding />
      <VideoLayer />
      <AuthModal />
    </div>
  )
}
