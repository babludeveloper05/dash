'use client'

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen,
  ChevronDown, Check, Circle, PlayCircle, Clock, Layers, TrendingUp,
} from 'lucide-react'
import {
  GlassCard, Pill, ProgressRing, EmptyState,
} from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { StatBlock } from '@/components/delta/data'
import { useStore, useSubjectProgress } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { subjectTone, subjectIcon } from '@/lib/subjects'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

type SubjectFilter = 'all' | string

export function SyllabusPage() {
  const [filter, setFilter] = useState<SubjectFilter>('all')
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({})
  const vp = useStore((s) => s.videoProgress)
  const openTheater = useStore((s) => s.openTheater)
  const subjectProgress = useSubjectProgress()
  const reduce = useReducedMotion() ?? false
  const content = useContent()
  const { subjects, chapters, videos } = content

  const overall = useMemo(() => {
    const all = videos
    const done = all.filter((v) => vp[v.id]?.completed).length
    const inProgress = all.filter((v) => {
      const p = vp[v.id]
      return p && !p.completed && p.fraction > 0
    }).length
    const chaptersDone = chapters.filter((c) => {
      const vids = videos.filter((v) => v.chapterId === c.id)
      return vids.length > 0 && vids.every((v) => vp[v.id]?.completed)
    }).length
    return {
      topicsTotal: all.length,
      topicsDone: done,
      inProgress,
      pct: all.length ? done / all.length : 0,
      chaptersTotal: chapters.length,
      chaptersDone,
    }
  }, [vp, videos, chapters])

  function chapterStats(cid: string) {
    const vids = videos.filter((v) => v.chapterId === cid)
    const done = vids.filter((v) => vp[v.id]?.completed).length
    return { total: vids.length, done, pct: vids.length ? done / vids.length : 0 }
  }

  const visibleSubjects = useMemo(() => {
    if (filter === 'all') return subjects
    return subjects.filter((s) => s.id === filter)
  }, [filter, subjects])

  return (
    <ScaledPage>
      <motion.div
        className="flex flex-col gap-4"
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      {/* Overall summary row */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 pt-5 grid grid-cols-2 @sm:grid-cols-4 gap-3">
        <StatBlock
          label="Topics mastered"
          value={String(overall.topicsDone)}
          sub={`of ${overall.topicsTotal}`}
          icon={<Check className="size-4 text-success" />}
        />
        <StatBlock
          label="Chapters done"
          value={String(overall.chaptersDone)}
          sub={`of ${overall.chaptersTotal}`}
          icon={<BookOpen className="size-4 text-primary" />}
        />
        <StatBlock
          label="In progress"
          value={String(overall.inProgress)}
          sub="active topics"
          icon={<TrendingUp className="size-4 text-warning" />}
        />
        <StatBlock
          label="Completion"
          value={`${Math.round(overall.pct * 100)}%`}
          sub="overall"
          icon={<Layers className="size-4 text-primary" />}
        />
      </motion.div>

      {/* Subject filter pills */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 flex items-center gap-2 flex-wrap">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </Pill>
        {subjects.map((s) => {
          const Icon = subjectIcon(s.id)
          const pct = Math.round((subjectProgress[s.id] ?? 0) * 100)
          const active = filter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all border',
                active
                  ? 'bg-cream text-cream-foreground border-transparent'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border-border'
              )}
            >
              <Icon
                className="size-3.5"
                style={{ color: active ? 'inherit' : subjectTone(s.id) }}
              />
              <span>{s.name}</span>
              <span
                className={cn(
                  'text-[10px] tabular rounded-full px-1.5 py-0.5',
                  active
                    ? 'bg-black/10 text-cream-foreground/70'
                    : 'bg-white/10 text-muted-foreground'
                )}
              >
                {pct}%
              </span>
            </button>
          )
        })}
      </motion.div>

      {/* Chapter list */}
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 pb-5">
        {visibleSubjects.length === 0 ? (
          <GlassCard className="p-6 min-h-[200px] flex items-center justify-center">
            <EmptyState
              icon={<Layers className="size-6" />}
              title="No chapters here"
              hint="Pick another subject to continue tracking."
            />
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleSubjects.map((subject) => {
              const Icon = subjectIcon(subject.id)
              const accent = subjectTone(subject.id)
              const subChapters = chapters.filter((c) => c.subjectId === subject.id)
              const subVideos = videos.filter((v) => v.subjectId === subject.id)
              const subDone = subVideos.filter((v) => vp[v.id]?.completed).length
              const subPct = subVideos.length ? subDone / subVideos.length : 0
              const collapsed = collapsedSubjects[subject.id] ?? false

              return (
                <section key={subject.id} className="flex flex-col gap-2">
                  <button
                    onClick={() =>
                      setCollapsedSubjects((c) => ({
                        ...c,
                        [subject.id]: !collapsed,
                      }))
                    }
                    aria-expanded={!collapsed}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <span
                      className="grid place-items-center size-9 rounded-xl border shrink-0"
                      style={{
                        background: `color-mix(in oklch, ${accent} 14%, transparent)`,
                        borderColor: `color-mix(in oklch, ${accent} 28%, transparent)`,
                      }}
                    >
                      <Icon className="size-4" style={{ color: accent }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{subject.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {subChapters.length} chapters · {subDone}/{subVideos.length} topics
                      </p>
                    </div>
                    <ProgressRing value={subPct} size={36} stroke={4} valueClass="text-primary">
                      <span className="text-[10px] font-medium tabular text-muted-foreground">
                        {Math.round(subPct * 100)}
                      </span>
                    </ProgressRing>
                    <ChevronDown
                      className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        collapsed && '-rotate-90'
                      )}
                    />
                  </button>

                  {!collapsed && (
                    <div className="flex flex-col gap-1.5 pl-1">
                      {subChapters.map((c) => {
                        const st = chapterStats(c.id)
                        const open = openChapters[c.id] ?? false
                        const vids = videos.filter((v) => v.chapterId === c.id)
                        const complete = st.pct === 1
                        return (
                          <div
                            key={c.id}
                            className="rounded-xl border border-border bg-white/[0.02] overflow-hidden transition-colors hover:bg-white/[0.04]"
                          >
                            <div className="flex items-stretch">
                              {/* Subject accent rail */}
                              <div
                                className="w-1 shrink-0"
                                style={{
                                  background: complete
                                    ? 'oklch(0.7 0.13 150)'
                                    : `color-mix(in oklch, ${accent} 60%, transparent)`,
                                  opacity: complete ? 0.7 : 0.6,
                                }}
                                aria-hidden
                              />
                              <button
                                onClick={() =>
                                  setOpenChapters((o) => ({ ...o, [c.id]: !open }))
                                }
                                aria-expanded={open}
                                className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
                              >
                                <span className="grid place-items-center size-9 rounded-lg bg-white/5 border border-border shrink-0 text-[11px] font-medium tabular text-muted-foreground">
                                  {complete ? (
                                    <Check className="size-4 text-success" />
                                  ) : (
                                    String(c.number).padStart(2, '0')
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{c.title}</p>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <BookOpen className="size-3" />
                                      {st.done}/{st.total} topics
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="size-3" /> {c.durationMin}m
                                    </span>
                                    {/* Inline progress bar (sm+) */}
                                    <span className="hidden @sm:flex flex-1 max-w-[120px] h-1 rounded-full bg-white/10 overflow-hidden">
                                      <span
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${Math.round(st.pct * 100)}%`,
                                          background: complete
                                            ? 'oklch(0.7 0.13 150)'
                                            : accent,
                                        }}
                                      />
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    'text-[11px] tabular font-medium shrink-0',
                                    complete ? 'text-success' : 'text-muted-foreground'
                                  )}
                                >
                                  {Math.round(st.pct * 100)}%
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'size-4 text-muted-foreground transition-transform shrink-0',
                                    open && 'rotate-180'
                                  )}
                                />
                              </button>
                            </div>

                            {open && (
                              <div className="border-t border-border divide-y divide-border/50 bg-black/20">
                                {vids.map((v) => {
                                  const p = vp[v.id]
                                  const vDone = p?.completed
                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => openTheater(v.id)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 pl-5 hover:bg-white/[0.04] text-left transition-colors"
                                    >
                                      {vDone ? (
                                        <Check className="size-4 text-success shrink-0" />
                                      ) : p && p.fraction > 0 ? (
                                        <PlayCircle className="size-4 text-primary shrink-0" />
                                      ) : (
                                        <Circle className="size-4 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="text-sm flex-1 min-w-0 truncate">
                                        {v.title}
                                      </span>
                                      {p && p.fraction > 0 && !p.completed && (
                                        <span className="text-[11px] text-primary tabular shrink-0">
                                          {Math.round(p.fraction * 100)}%
                                        </span>
                                      )}
                                      <span className="text-[11px] text-muted-foreground shrink-0 hidden @sm:inline">
                                        {v.instructor}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}
