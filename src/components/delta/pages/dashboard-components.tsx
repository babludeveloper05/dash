'use client'

import { useStore, useSubjectProgress } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { fmtDuration, fmtDeadline, fmtAgo } from '@/lib/format'
import { subjectTone, subjectPoster } from '@/lib/subjects'
import { ProgressRing } from '../ui'
import { cn } from '@/lib/utils'
import {
  Flame, Target, BookMarked, StickyNote, Trophy, Activity as ActivityIcon,
  TrendingUp, Radio, CalendarClock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Today as 0=Mon..6=Sun, matching the `days` array order. */
function todayIndex() {
  return (new Date().getDay() + 6) % 7
}

/* ------------------------------------------------------------------ */
/*  Shared header                                                      */
/* ------------------------------------------------------------------ */

function Header({
  icon,
  title,
  action,
  actionLabel,
  full,
  accent,
}: {
  icon: ReactNode
  title: string
  action?: () => void
  actionLabel?: string
  full?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 mb-3',
        full ? 'justify-center' : 'justify-between'
      )}
    >
      <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/90">
        <span className={cn(accent ? 'text-primary' : 'text-muted-foreground/80')}>{icon}</span>
        <span className="truncate">{title}</span>
      </span>
      {action && (
        <button
          onClick={action}
          aria-label={actionLabel ?? `Open ${title}`}
          className="text-muted-foreground/70 hover:text-foreground transition-colors -mr-1 p-0.5"
        >
          <ArrowUpRight className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Components                                                            */
/* ------------------------------------------------------------------ */

export function ComponentGreeting() {
  const firstName = useStore((s) => s.profile.name).split(' ')[0]
  const streak = useStore((s) => s.streak)
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex items-center justify-between h-full gap-4 px-0.5">
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-semibold tracking-tight text-balance leading-tight">
          {greeting()},{' '}
          <span className="font-bold text-gradient-warm">{firstName}</span>
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-pretty">
          {dateStr}
          <span className="text-muted-foreground/60"> · </span>
          <span className="text-foreground/70">Let&apos;s make today count.</span>
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/8 border border-primary/20 px-3.5 py-1.5 shrink-0">
        <Flame className="size-4 text-primary" />
        <span className="text-sm font-medium text-primary tabular leading-none">
          {streak}
          <span className="text-primary/70 ml-1 text-[11px] font-normal">day streak</span>
        </span>
      </div>
    </div>
  )
}

export function ComponentStreak() {
  const streak = useStore((s) => s.streak)
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = todayIndex()
  // Assume the current streak fills the past `streak % 7` days within this week,
  // capped at the days that have passed so far this week (today inclusive).
  const filledThisWeek = Math.min(today + 1, streak % 7 === 0 && streak > 0 ? 7 : streak % 7)

  return (
    <div className="flex flex-col h-full">
      <Header icon={<Flame className="size-3.5" />} title="Streak" accent />
      <div className="flex items-end gap-2 mt-0.5">
        <span className="text-4xl font-light tabular leading-none">{streak}</span>
        <span className="text-[11px] text-muted-foreground leading-tight mb-1">
          days
          <br />
          in a row
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mt-auto pt-3">
        {days.map((d, i) => {
          const completed = i < filledThisWeek
          const isToday = i === today
          const upcoming = !completed && !isToday
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'size-5 rounded-md transition-colors',
                  completed && !isToday && 'bg-primary/85',
                  isToday && 'bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-card',
                  upcoming && 'bg-white/[0.06]'
                )}
              />
              <span
                className={cn(
                  'text-[9px] tabular',
                  isToday ? 'text-primary font-medium' : 'text-muted-foreground/70'
                )}
              >
                {d}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ComponentNextClass() {
  const setTab = useStore((s) => s.setTab)
  const content = useContent(); const live = content.liveSessions.find((l) => l.isLive)
  const next = content.liveSessions.find((l) => !l.isLive) ?? content.liveSessions[0]
  const session = live ?? next

  return (
    <div className="flex flex-col h-full">
      <Header icon={<CalendarClock className="size-3.5" />} title="Next Class" />
      {session ? (
        <>
          <p className="text-sm font-medium mt-0.5 truncate">{session.subject}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 text-pretty leading-snug">
            {session.topic}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1.5">{session.instructor}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            {live ? (
              <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <span className="size-1.5 rounded-full bg-primary live-dot" />
                Live now
              </span>
        ) : (
          <span className="text-xs text-muted-foreground tabular">
            in <span className="text-foreground/80">{next?.startsInHours ?? 0}h</span> 00m
          </span>
        )}
        <button
          onClick={() => setTab('live')}
          aria-label={live ? 'Join live class' : 'Set reminder for next class'}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-all active:translate-y-px',
            live
              ? 'bg-primary text-primary-foreground hover:brightness-110'
              : 'bg-white/5 border border-border hover:bg-white/10 text-foreground'
          )}
        >
          {live ? 'Join' : 'Remind'}
        </button>
      </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">No classes scheduled</p>
      )}
    </div>
  )
}

export function ComponentDailyGoal() {
  const hoursToday = useStore((s) => s.hoursToday)
  const dailyGoalHours = useStore((s) => s.dailyGoalHours)
  const setTab = useStore((s) => s.setTab)
  const pct = Math.min(1, hoursToday / dailyGoalHours)
  const complete = pct >= 1

  return (
    <div className="flex flex-col h-full items-center">
      <Header icon={<Target className="size-3.5" />} title="Daily Goal" full accent />
      <ProgressRing value={pct} size={92} stroke={9} className="my-1.5">
        <div className="text-center leading-none">
          <span className="text-xl font-light tabular">{Math.round(pct * 100)}</span>
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      </ProgressRing>
      <p className="text-[11px] text-muted-foreground tabular">
        <span className="text-foreground font-medium">{hoursToday}h</span> / {dailyGoalHours}h
      </p>
      <button
        onClick={() => setTab('library')}
        aria-label="Study now"
        className={cn(
          'mt-auto w-full rounded-full py-1.5 text-xs font-medium transition-all active:translate-y-px',
          complete
            ? 'bg-success/15 text-success border border-success/25'
            : 'bg-primary text-primary-foreground hover:brightness-110'
        )}
      >
        {complete ? 'Goal reached' : 'Study Now'}
      </button>
    </div>
  )
}

export function ComponentSubjectRings() {
  const subjectProgress = useSubjectProgress()
  const content = useContent(); const core = content.subjects.slice(0, 3)
  return (
    <div className="flex flex-col h-full">
      <Header icon={<TrendingUp className="size-3.5" />} title="Subject Progress" />
      <div className="flex items-center justify-around flex-1 gap-1">
        {core.map((s) => {
          const pct = subjectProgress[s.id] ?? 0
          return (
            <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-0">
              <ProgressRing value={pct} size={72} stroke={7}>
                <div className="text-center leading-none">
                  <span className="text-sm font-light tabular">{Math.round((pct || 0) * 100)}</span>
                  <span className="block text-[8px] text-muted-foreground mt-0.5">%</span>
                </div>
              </ProgressRing>
              <span className="text-[11px] text-muted-foreground text-center truncate max-w-[72px]">
                {s.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ComponentTestDue() {
  const setTab = useStore((s) => s.setTab)
  const content = useContent(); const due = content.tests
    .filter((t): t is typeof t & { deadlineHours: number } => t.deadlineHours !== null)
    .sort((a, b) => a.deadlineHours - b.deadlineHours)
    .slice(0, 4)

  return (
    <div className="flex flex-col h-full">
      <Header icon={<BookMarked className="size-3.5" />} title="Tests Due" />
      <div className="flex-1 space-y-0.5 overflow-y-auto scroll-thin mt-0.5 -mx-1">
        {due.map((t) => {
          const hours = t.deadlineHours
          const tone: 'destructive' | 'warning' | 'muted' =
            hours < 12 ? 'destructive' : hours < 48 ? 'warning' : 'muted'
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04] transition-colors group"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  tone === 'destructive' && 'bg-destructive',
                  tone === 'warning' && 'bg-warning',
                  tone === 'muted' && 'bg-muted-foreground/50'
                )}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-xs truncate text-pretty">{t.name}</span>
                <span
                  className={cn(
                    'text-[10px] tabular',
                    tone === 'destructive' && 'text-destructive/90',
                    tone === 'warning' && 'text-warning/90',
                    tone === 'muted' && 'text-muted-foreground'
                  )}
                >
                  {fmtDeadline(hours)}
                </span>
              </span>
              <button
                onClick={() => setTab('tests')}
                aria-label={`Start test ${t.name}`}
                className="rounded-full bg-white/5 border border-border px-2.5 py-0.5 text-[10px] font-medium transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
              >
                Start
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ComponentQuickNotes() {
  const quickScratch = useStore((s) => s.quickScratch)
  const setQuickScratch = useStore((s) => s.setQuickScratch)
  const notes = useStore((s) => s.notes)

  return (
    <div className="flex flex-col h-full">
      <Header icon={<StickyNote className="size-3.5" />} title="Quick Notes" />
      <textarea
        value={quickScratch}
        onChange={(e) => setQuickScratch(e.target.value)}
        placeholder="Jot something down…"
        aria-label="Quick scratch note"
        className="w-full resize-none rounded-xl bg-white/[0.04] border border-border p-2.5 text-xs outline-none focus:border-primary/40 focus:bg-white/[0.06] placeholder:text-muted-foreground/60 h-16 scroll-thin transition-colors text-pretty"
      />
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto scroll-thin min-h-0">
        {notes.slice(0, 2).map((n) => (
          <p
            key={n.id}
            className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5"
          >
            <span className="size-1 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="truncate">{n.title}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export function ComponentLeaderPeek() {
  const setTab = useStore((s) => s.setTab)
  const content = useContent()
  const you = { rank: 0, score: 0, name: 'You', batch: '', streak: 0, change: 0, id: '' }
  const top3: { id: string; name: string; score: number }[] = []
  const up = you.change >= 0

  return (
    <div className="flex flex-col h-full">
      <Header
        icon={<Trophy className="size-3.5" />}
        title="Leaderboard"
        action={() => setTab('leaderboard')}
        actionLabel="Open leaderboard"
      />
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-3xl font-light tabular leading-none">#{you.rank}</span>
        <span
          className={cn(
            'flex items-center text-[11px] font-medium tabular px-1.5 py-0.5 rounded-md',
            up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
          )}
        >
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(you.change)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground tabular mt-0.5">
        {you.score.toLocaleString()} pts
      </p>
      <div className="mt-auto space-y-1 pt-2 border-t border-border/60">
        {top3.map((l, i) => (
          <div key={l.id} className="flex items-center gap-2 text-[11px]">
            <span
              className={cn(
                'w-4 tabular font-medium',
                i === 0 ? 'text-primary' : i === 1 ? 'text-foreground/70' : 'text-muted-foreground'
              )}
            >
              {i + 1}
            </span>
            <span className="flex-1 truncate text-muted-foreground">{l.name}</span>
            <span className="tabular text-foreground/80">{l.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComponentRecentActivity() {
  const content = useContent()
  const items: { id: string; label: string; type: string; minutesAgo: number }[] = []
  return (
    <div className="flex flex-col h-full">
      <Header icon={<ActivityIcon className="size-3.5" />} title="Recent Activity" />
      <div className="flex-1 overflow-y-auto scroll-thin mt-0.5 -mx-1 px-1">
        <div className="relative">
          {items.map((a, i) => {
            const last = i === items.length - 1
            return (
              <div key={a.id} className="flex gap-2.5 pb-2.5 last:pb-0">
                <div className="relative flex flex-col items-center self-stretch">
                  <span
                    className={cn(
                      'size-2 rounded-full shrink-0 mt-1',
                      i === 0 ? 'bg-primary' : 'bg-muted-foreground/50'
                    )}
                  />
                  {!last && <span className="absolute top-2.5 bottom-0 w-px bg-border" />}
                </div>
                <span className="min-w-0 flex-1 -mt-0.5">
                  <span className="block text-[11px] line-clamp-1 text-pretty leading-snug">
                    {a.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular">
                    {fmtAgo(a.minutesAgo)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ComponentBatchRank() {
  const content = useContent()
  const you = { rank: 0, score: 0, name: 'You', batch: '', streak: 0, change: 0, id: '' }
  const start = Math.max(0, you.rank - 2)
  const end = you.rank + 1
  const nearby: typeof you[] = you.rank > 0 ? [you] : []

  return (
    <div className="flex flex-col h-full">
      <Header icon={<TrendingUp className="size-3.5" />} title="Batch Rank" />
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-3xl font-light tabular leading-none">#{you.rank}</span>
        <span className="text-[10px] text-muted-foreground truncate">{you.batch}</span>
      </div>
      <div className="mt-auto space-y-0.5 pt-2 border-t border-border/60">
        {nearby.map((l) => (
          <div
            key={l.id}
            className={cn(
              'flex items-center gap-2 text-[11px] rounded-md px-1.5 py-1 transition-colors',
              l.you
                ? 'bg-primary/10 border border-primary/20'
                : 'border border-transparent hover:bg-white/[0.04]'
            )}
          >
            <span className="text-muted-foreground w-5 tabular">#{l.rank}</span>
            <span
              className={cn(
                'flex-1 truncate',
                l.you ? 'text-primary font-medium' : 'text-foreground/80'
              )}
            >
              {l.you ? 'You' : l.name.split(' ')[0]}
            </span>
            <span className="tabular text-muted-foreground">{l.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComponentLiveStatus() {
  const setTab = useStore((s) => s.setTab)
  const content = useContent(); const live = content.liveSessions.find((l) => l.isLive)
  const next = content.liveSessions.find((l) => !l.isLive) ?? content.liveSessions[0]

  return (
    <div className="flex items-center justify-between h-full gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {live ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <span className="size-1.5 rounded-full bg-destructive live-dot" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Radio className="size-3.5 text-muted-foreground" />
              Up next
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate text-pretty">
          {live
            ? `${live.subject} · ${live.viewers.toLocaleString()} watching`
            : next
              ? `${next.subject} · in ${next.startsInHours}h`
              : 'No sessions scheduled'}
        </p>
      </div>
      <button
        onClick={() => setTab('live')}
        aria-label={live ? 'Join live class' : 'View live schedule'}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-all active:translate-y-px shrink-0',
          live
            ? 'bg-primary text-primary-foreground hover:brightness-110'
            : 'bg-white/5 border border-border hover:bg-white/10 text-foreground'
        )}
      >
        {live ? 'Join' : 'View'}
      </button>
    </div>
  )
}

export function ComponentCustomCountdown() {
  const date = useStore((s) => s.customCountdownDate)
  const label = useStore((s) => s.countdownLabel)
  const days = Math.max(
    0,
    Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  )

  return (
    <div className="flex flex-col h-full items-center justify-center text-center">
      <Header icon={<CalendarClock className="size-3.5" />} title={label} full accent />
      <span className="text-5xl font-extralight tabular text-primary my-2 leading-none">
        {days}
      </span>
      <span className="text-xs text-muted-foreground">days remaining</span>
      <span className="text-[10px] text-muted-foreground/70 mt-1 tabular">
        {new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

export const COMPONENT_REGISTRY: Record<string, { title: string; render: () => ReactNode }> = {
  greeting: { title: 'Greeting & Date', render: () => <ComponentGreeting /> },
  streak: { title: 'Streak Tracker', render: () => <ComponentStreak /> },
  nextClass: { title: 'Next Class', render: () => <ComponentNextClass /> },
  dailyGoal: { title: 'Daily Goal', render: () => <ComponentDailyGoal /> },
  subjectRings: { title: 'Subject Progress', render: () => <ComponentSubjectRings /> },
  testDue: { title: 'Tests Due', render: () => <ComponentTestDue /> },
  quickNotes: { title: 'Quick Notes', render: () => <ComponentQuickNotes /> },
  leaderPeek: { title: 'Leaderboard Peek', render: () => <ComponentLeaderPeek /> },
  recentActivity: { title: 'Recent Activity', render: () => <ComponentRecentActivity /> },
  batchRank: { title: 'Batch Rank', render: () => <ComponentBatchRank /> },
  liveStatus: { title: 'Live Status', render: () => <ComponentLiveStatus /> },
  customCountdown: { title: 'Custom Countdown', render: () => <ComponentCustomCountdown /> },
}
