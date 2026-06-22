'use client'

import { motion } from 'framer-motion'
import { useStore, type TabId } from '@/lib/store'
import { Avatar, IconButton } from './ui'
import { cn } from '@/lib/utils'
import { Bell, Search, Triangle, LogIn, LogOut } from 'lucide-react'
import { navSpring } from '@/lib/motion'

const ALL_TAB_LABELS: Record<TabId, string> = {
  home: 'Home',
  library: 'Library',
  tests: 'Tests',
  notes: 'Notes',
  live: 'Live',
  analytics: 'Analytics',
  leaderboard: 'Ranks',
  achievements: 'Wins',
  profile: 'Profile',
  settings: 'Settings',
  syllabus: 'Syllabus',
  doubts: 'Doubts',
  playground: 'Playground',
}

export function TopNav() {
  const activeTab = useStore((s) => s.activeTab)
  const setTab = useStore((s) => s.setTab)
  const setSpotlight = useStore((s) => s.setSpotlight)
  const profileName = useStore((s) => s.profile.name)
  const authUser = useStore((s) => s.authUser)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const setAuthUser = useStore((s) => s.setAuthUser)
  // User-customizable nav: only show tabs the user enabled during onboarding
  // (or in Settings). Falls back to the default 10-tab set if empty (pre-
  // onboarding or legacy users). Profile + Settings are always shown.
  const enabledTabs = useStore((s) => s.enabledTabs)
  const tabs =
    enabledTabs.length > 0
      ? enabledTabs
      : ['home', 'library', 'tests', 'notes', 'live', 'analytics', 'leaderboard', 'achievements', 'profile', 'settings'] as TabId[]
  const navTabs = tabs.filter((t) => t !== 'playground') // playground is hidden, reached via Settings

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 glass-strong border-b border-border flex items-center px-4 sm:px-5 gap-3 sm:gap-4">
      {/* Logo */}
      <button
        onClick={() => setTab('home')}
        className="flex items-center gap-2.5 shrink-0 group"
        aria-label="Project Delta — Home"
      >
        <span className="grid place-items-center size-8 rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
          <Triangle className="size-4 fill-current" />
        </span>
        <span className="hidden sm:block font-semibold tracking-tight text-[15px]">
          Project <span className="text-primary">Delta</span>
        </span>
      </button>

      {/* Center nav */}
      <nav className="flex-1 flex items-center justify-center min-w-0">
        <div className="flex items-center gap-0.5 rounded-full bg-white/5 border border-border p-1 overflow-x-auto scroll-none max-w-full">
          {navTabs.map((id) => {
            const on = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative rounded-full px-3 sm:px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                  on
                    ? 'text-cream-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill-active"
                    className="absolute inset-0 rounded-full bg-cream elev-1"
                    transition={navSpring}
                    style={{ zIndex: 0 }}
                    aria-hidden
                  />
                )}
                <span className="relative z-[1]">{ALL_TAB_LABELS[id]}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={() => setSpotlight(true)}
          className="hidden md:flex items-center gap-2 rounded-full bg-white/5 border border-border pl-3 pr-2 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          aria-label="Open search"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </button>
        <button
          onClick={() => setSpotlight(true)}
          className="md:hidden grid place-items-center rounded-full size-9 bg-white/5 border border-border text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>
        <div className="relative">
          <IconButton label="Notifications">
            <Bell className="size-4" />
          </IconButton>
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        </div>
        {authUser ? (
          <>
            <span className="hidden sm:inline text-xs text-muted-foreground max-w-[100px] truncate">{authUser.name}</span>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                setAuthUser(null)
                window.location.reload()
              }}
              aria-label="Sign out"
              className="grid place-items-center rounded-full size-9 bg-white/5 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium hover:brightness-110 transition-all"
          >
            <LogIn className="size-3.5" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
        <button onClick={() => setTab('profile')} aria-label="Open profile" className="rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={profileName} size={36} />
        </button>
      </div>
    </header>
  )
}
