'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Radio, Users, Bell, BellRing, Calendar, Clock, Play, CheckCircle2,
  ChevronRight, Sparkles, History,
} from 'lucide-react'
import {
  GlassCard, PrimaryButton, GhostButton,
  IconButton, Avatar, EmptyState, Divider, Badge,
  PageSkeleton, ErrorState,
} from '@/shared/ui'
import { ScaledPage } from '@/features/scaled-page'
import { useStore } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { cn } from '@/lib/utils'
import { subjectGradient, subjectTone } from '@/lib/subjects'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

interface LiveSession {
  id: string; subject: string; topic: string; instructor: string
  startsInHours: number; viewers: number; isLive: boolean
}

export function LivePage() {
  const content = useContent()
  const [apiSessions, setApiSessions] = useState<LiveSession[]>([])
  const reduce = useReducedMotion() ?? false

  useEffect(() => {
    fetch('/api/community/live')
      .then(r => r.json())
      .then(data => {
        setApiSessions(data.map((s: { id: string; subject: string; topic: string; instructor: string; viewers: number; isLive: boolean }) => ({
          id: s.id, subject: s.subject, topic: s.topic, instructor: s.instructor,
          startsInHours: 0, viewers: s.viewers, isLive: s.isLive,
        })))
      })
      .catch(() => {})
  }, [])

  const liveSessions = apiSessions.length > 0 ? apiSessions : content.liveSessions
  const live = liveSessions.find((s) => s.isLive) ?? null
  const upcoming = liveSessions.filter((s) => !s.isLive)
  const liveAttended = useStore((s) => s.liveAttended)
  const setLiveAttended = useStore((s) => s.setLiveAttended)
  const [reminders, setReminders] = useState<Record<string, boolean>>({})
  const [replay, setReplay] = useState(false)

  // Show skeleton while loading
  if (content.loading) {
    return <ScaledPage><PageSkeleton variant="list" /></ScaledPage>
  }

  // Show error state if fetch failed
  if (content.error) {
    return <ScaledPage><ErrorState message={content.error} onRetry={content.refresh} /></ScaledPage>
  }

  return (
    <ScaledPage>
      <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 px-5 pt-5">
        {live ? (
          <div
            className="flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-[11px] font-medium text-red-300"
            role="status"
            aria-live="polite"
          >
            <span className="size-1.5 rounded-full bg-red-400 live-dot" aria-hidden />
            <span className="tabular">{live.viewers.toLocaleString()}</span>
            <span className="hidden @sm:inline">watching</span>
          </div>
        ) : (
          <Badge tone="default">No live session</Badge>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 pb-5">
        <motion.div
          className="flex flex-col gap-5"
          variants={staggerContainer(reduce)}
          initial="initial"
          animate="animate"
        >
          {/* Hero live session */}
          {live && (
            <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)}>
            <GlassCard strong className="relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: subjectGradient(live.subject.toLowerCase()) }}
                aria-hidden
              />
              <div className="absolute inset-0 dot-grid opacity-25" aria-hidden />
              <div className="relative p-5 @sm:p-6 flex flex-col gap-5">
                {/* Top row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-500/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg shadow-red-500/30">
                      <span className="size-1.5 rounded-full bg-white live-dot" aria-hidden />
                      LIVE NOW
                    </span>
                    <span className="rounded-full bg-black/35 backdrop-blur px-2.5 py-1 text-[11px] text-white/90 flex items-center gap-1.5">
                      <Users className="size-3" />
                      <span className="tabular">{live.viewers.toLocaleString()}</span>
                      <span className="hidden @sm:inline">watching</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-white/65 flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    Started 45 min ago
                  </span>
                </div>

                {/* Main */}
                <div className="flex flex-col @lg:flex-row gap-5 @lg:items-end">
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border"
                      style={{
                        background: `color-mix(in oklch, ${subjectTone(live.subject.toLowerCase())} 18%, transparent)`,
                        borderColor: `color-mix(in oklch, ${subjectTone(live.subject.toLowerCase())} 35%, transparent)`,
                        color: subjectTone(live.subject.toLowerCase()),
                      }}
                    >
                      {live.subject}
                    </span>
                    <h2 className="mt-3 text-xl @sm:text-2xl font-light tracking-tight text-white text-balance leading-tight">
                      {live.topic}
                    </h2>
                    <div className="mt-3 flex items-center gap-2.5">
                      <Avatar name={live.instructor} size={36} />
                      <div className="text-[12px]">
                        <p className="text-white/95 font-medium">{live.instructor}</p>
                        <p className="text-white/55">Senior Faculty · {live.subject}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {liveAttended ? (
                      <>
                        <Badge tone="success">
                          <CheckCircle2 className="size-3" /> Joined
                        </Badge>
                        <GhostButton
                          className="bg-white/10 border-white/20 text-white hover:bg-white/15"
                          onClick={() => setReplay((r) => !r)}
                        >
                          <Play className="size-3.5" /> {replay ? 'Pause' : 'Resume'}
                        </GhostButton>
                      </>
                    ) : (
                      <PrimaryButton
                        onClick={() => setLiveAttended(true)}
                        className="bg-white text-black hover:brightness-95 px-5 py-2.5 text-sm"
                      >
                        <Radio className="size-4" /> Join Live
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress shimmer bar at bottom */}
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10 overflow-hidden">
                <span className="block h-full w-1/3 bg-red-500/80 animate-[liveSweep_3s_linear_infinite]" />
              </div>
            </GlassCard>
            </motion.div>
          )}

          {/* Upcoming sessions */}
          {upcoming.length > 0 && (
            <motion.section variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  Upcoming Sessions
                  <span className="text-[11px] text-muted-foreground tabular">
                    · {upcoming.length} scheduled
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 gap-3">
                {upcoming.map((s) => {
                  const glow = subjectTone(s.subject.toLowerCase())
                  const isReminder = !!reminders[s.id]
                  const startsLabel =
                    s.startsInHours < 24
                      ? `${s.startsInHours}h to go`
                      : `${Math.round(s.startsInHours / 24)}d to go`
                  return (
                    <GlassCard
                      key={s.id}
                      className="p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:elev-2 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: glow, boxShadow: `0 0 10px ${glow}` }}
                          aria-hidden
                        />
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: glow }}
                        >
                          {s.subject}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/5 border border-border px-2 py-0.5 text-[11px] tabular">
                          <Clock className="size-3" /> {startsLabel}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-snug text-balance line-clamp-2 min-h-[2.5rem]">
                        {s.topic}
                      </p>
                      <Divider />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={s.instructor} size={26} />
                          <span className="text-[12px] text-muted-foreground truncate">
                            {s.instructor}
                          </span>
                        </div>
                        <IconButton
                          label={isReminder ? 'Cancel reminder' : 'Set reminder'}
                          active={isReminder}
                          onClick={() =>
                            setReminders((r) => ({ ...r, [s.id]: !r[s.id] }))
                          }
                        >
                          {isReminder ? (
                            <BellRing className="size-4" />
                          ) : (
                            <Bell className="size-4" />
                          )}
                        </IconButton>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            </motion.section>
          )}

          {/* Recently attended */}
          {liveAttended && live && (
            <motion.section variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <History className="size-4 text-primary" />
                Recently Attended
              </h3>
              <GlassCard className="p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <span className="grid place-items-center size-12 rounded-xl bg-primary/15 text-primary border border-primary/20 shrink-0">
                  <Play className="size-5 fill-current" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{live.topic}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>
                      {live.subject} · {live.instructor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> attended just now
                    </span>
                  </p>
                </div>
                <GhostButton>
                  <ChevronRight className="size-3.5" /> Watch Again
                </GhostButton>
              </GlassCard>
            </motion.section>
          )}

          {/* Empty state — should not occur with current mock data but handled gracefully */}
          {!live && upcoming.length === 0 && (
            <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)}>
            <GlassCard className="p-6 min-h-[220px] flex items-center justify-center">
              <EmptyState
                icon={<Radio className="size-6" />}
                title="No sessions scheduled"
                hint="Check back soon — new live classes are added every day."
              />
            </GlassCard>
            </motion.div>
          )}
        </motion.div>
      </div>

      <style>{`@keyframes liveSweep{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
      </div>
    </ScaledPage>
  )
}
