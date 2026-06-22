'use client'

import { useStore } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { fmtDuration } from '@/lib/format'
import type { SubjectId } from '@/lib/types'
import { subjectPoster } from '@/lib/subjects'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Play, Pause, X, Maximize2, Minimize2, PictureInPicture2, SkipBack, SkipForward,
  Volume2, VolumeX, Gauge, Heart, Bookmark, Download, ListVideo, Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Subject poster gradients (cinematic warm dark per subject)         */
/* ------------------------------------------------------------------ */

const SUBJECT_POSTER: Record<SubjectId, string> = {
  physics: 'from-[oklch(0.34_0.075_62)] via-[oklch(0.22_0.05_62)] to-[oklch(0.10_0.015_62)]',
  chemistry: 'from-[oklch(0.34_0.075_150)] via-[oklch(0.22_0.05_150)] to-[oklch(0.10_0.015_150)]',
  maths: 'from-[oklch(0.34_0.06_250)] via-[oklch(0.22_0.04_250)] to-[oklch(0.10_0.015_250)]',
  biology: 'from-[oklch(0.34_0.075_30)] via-[oklch(0.22_0.05_30)] to-[oklch(0.10_0.015_30)]',
  cs: 'from-[oklch(0.34_0.06_200)] via-[oklch(0.22_0.04_200)] to-[oklch(0.10_0.015_200)]',
  english: 'from-[oklch(0.34_0.055_90)] via-[oklch(0.22_0.04_90)] to-[oklch(0.10_0.015_90)]',
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2]

export function getVideo(id: string, videos: { id: string; chapterId: string; subjectId: string; number: number; title: string; instructor: string; durationSec: number }[]) {
  return videos.find((v) => v.id === id)
}

function isTextTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

function chapterTitleOf(videoId: string | null, videos: { id: string; chapterId: string }[], chapters: { id: string; title: string }[]): string {
  if (!videoId) return ''
  const v = videos.find((vid) => vid.id === videoId)
  if (!v) return ''
  return chapters.find((c) => c.id === v.chapterId)?.title ?? ''
}

/* ------------------------------------------------------------------ */
/*  Playback engine (UNCHANGED — still advances store progress)        */
/* ------------------------------------------------------------------ */

function usePlayback(videoId: string | null, video: { id: string; durationSec: number; chapterId: string; subjectId: string; number: number; title: string; instructor: string } | null) {
  const { videoProgress, setVideoProgress } = useStore()
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const fraction = videoId ? videoProgress[videoId]?.fraction ?? 0 : 0
  const accRef = useRef(0)

  useEffect(() => {
    setPlaying(true)
  }, [videoId])

  useEffect(() => {
    if (!playing || !video || !videoId) return
    const iv = setInterval(() => {
      const cur = useStore.getState().videoProgress[videoId]?.fraction ?? 0
      const next = Math.min(1, cur + (speed * 1) / video.durationSec)
      setVideoProgress(videoId, next)
      // bump study hours occasionally
      accRef.current += speed
      if (accRef.current > 60) {
        accRef.current = 0
      }
      if (next >= 1) setPlaying(false)
    }, 250)
    return () => clearInterval(iv)
  }, [playing, video, videoId, speed, setVideoProgress])

  return { playing, setPlaying, speed, setSpeed, fraction, video }
}

/* ------------------------------------------------------------------ */
/*  Seekbar with chapter markers + larger hover thumb                  */
/* ------------------------------------------------------------------ */

function Seekbar({
  fraction,
  duration,
  onSeek,
}: {
  fraction: number
  duration: number
  onSeek: (f: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [hoverFrac, setHoverFrac] = useState<number | null>(null)

  function fracFromClientX(clientX: number) {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(fraction * duration)}
      tabIndex={0}
      className="group/seek relative h-5 flex items-center cursor-pointer select-none focus-visible:outline-none"
      onClick={(e) => onSeek(fracFromClientX(e.clientX))}
      onMouseMove={(e) => setHoverFrac(fracFromClientX(e.clientX))}
      onMouseLeave={() => setHoverFrac(null)}
    >
      {/* Track */}
      <div className="relative h-1.5 w-full rounded-full bg-white/12 overflow-visible">
        {/* Buffered hint zones (visual only — chapters at 25/50/75) */}
        {[0.25, 0.5, 0.75].map((m) => (
          <span
            key={m}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-1.5 rounded-full bg-white/30 ring-2 ring-black/40"
            style={{ left: `${m * 100}%` }}
          />
        ))}
        {/* Hover preview fill */}
        {hoverFrac !== null && hoverFrac > fraction && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/15"
            style={{ width: `${hoverFrac * 100}%` }}
          />
        )}
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {/* Active thumb */}
      <span
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream elev-1 opacity-0 transition-opacity duration-200 group-hover/seek:opacity-100"
        style={{ left: `${fraction * 100}%` }}
      />
      {/* Hover scrub marker + tooltip */}
      {hoverFrac !== null && (
        <>
          <span
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 pointer-events-none"
            style={{ left: `${hoverFrac * 100}%` }}
          />
          <span
            className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] tabular text-white pointer-events-none"
            style={{ left: `${hoverFrac * 100}%` }}
          >
            {fmtDuration(Math.round(hoverFrac * duration))}
          </span>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small control primitives                                           */
/* ------------------------------------------------------------------ */

function CtrlButton({
  onClick,
  label,
  children,
  active,
  className,
}: {
  onClick?: () => void
  label: string
  children: React.ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid place-items-center size-9 rounded-full transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/8',
        className
      )}
    >
      {children}
    </button>
  )
}

function ActionToggle({
  label,
  icon: Icon,
}: {
  label: string
  icon: LucideIcon
}) {
  const [active, setActive] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setActive((a) => !a)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'grid place-items-center size-9 rounded-full border transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        active
          ? 'border-primary/30 bg-primary/12 text-primary'
          : 'border-border bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
      )}
    >
      <Icon className={cn('size-4', active && 'fill-current')} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  VideoLayer — theater + PiP                                         */
/* ------------------------------------------------------------------ */

export function VideoLayer() {
  const {
    theaterVideoId, pipVideoId, closeTheater, enterPip, closePip,
    restoreFromPip, openTheater, videoProgress,
  } = useStore()
  const content = useContent()
  const [maximized, setMaximized] = useState(false)
  const [muted, setMuted] = useState(false)
  const theaterVideo = theaterVideoId ? getVideo(theaterVideoId, content.videos) : null
  const pipVideo = pipVideoId ? getVideo(pipVideoId, content.videos) : null
  const theater = usePlayback(theaterVideoId, theaterVideo)
  const pip = usePlayback(pipVideoId, pipVideo)
  const containerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus management: move focus into the dialog when it opens so
  // keyboard users can immediately use Space/Arrows/Escape.
  useEffect(() => {
    if (theaterVideoId && modalRef.current) {
      // Defer to next tick so the element is painted.
      const id = window.setTimeout(() => modalRef.current?.focus(), 30)
      return () => window.clearTimeout(id)
    }
  }, [theaterVideoId])

  // Sync local `maximized` state with browser fullscreen changes (so pressing
  // Escape in native fullscreen keeps our UI in sync).
  useEffect(() => {
    function onFsChange() {
      setMaximized(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard shortcuts
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  function cycleSpeed() {
    const idx = SPEED_OPTIONS.indexOf(theater.speed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    theater.setSpeed(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!theaterVideoId) return

      // Don't hijack typing in inputs/textareas.
      if (isTextTarget(e.target)) return

      if (e.key === 'Escape') {
        e.preventDefault()
        closeTheater()
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        theater.setPlaying((p) => !p)
        return
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const v = getVideo(theaterVideoId, content.videos)
        if (!v) return
        const cur = useStore.getState().videoProgress[theaterVideoId]?.fraction ?? 0
        const delta = e.key === 'ArrowRight' ? 10 : -10
        const next = Math.max(0, Math.min(1, cur + delta / v.durationSec))
        useStore.getState().setVideoProgress(theaterVideoId, next)
        return
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [theaterVideoId, closeTheater, theater])

  // Up-next queue: current video + next 5 from the same chapter.
  const queue = useMemo(() => {
    if (!theaterVideoId || !theater.video) return [] as typeof videos
    const chapterVids = content.videos.filter((v) => v.chapterId === theater.video!.chapterId)
    const idx = chapterVids.findIndex((v) => v.id === theaterVideoId)
    if (idx === -1) return chapterVids.slice(0, 6)
    const after = chapterVids.slice(idx)
    if (after.length >= 6) return after.slice(0, 6)
    const before = chapterVids.slice(0, 6 - after.length)
    return [...after, ...before]
  }, [theaterVideoId, theater.video])

  return (
    <>
      <style>{`
        @keyframes deltaBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes deltaTheaterIn {
          from { opacity: 0; transform: scale(0.965) translateY(8px) }
          to { opacity: 1; transform: none }
        }
        @keyframes deltaPipIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96) }
          to { opacity: 1; transform: none }
        }
        @keyframes deltaPlayPulse {
          0% { box-shadow: 0 0 0 0 oklch(0.62 0.2 22 / 0.45) }
          70% { box-shadow: 0 0 0 16px oklch(0.62 0.2 22 / 0) }
          100% { box-shadow: 0 0 0 0 oklch(0.62 0.2 22 / 0) }
        }
        @keyframes deltaEqualize {
          0%, 100% { transform: scaleY(0.4) }
          50% { transform: scaleY(1) }
        }
      `}</style>

      {/* THEATER */}
      {theaterVideoId && theater.video && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
          onClick={() => closeTheater()}
          style={{ animation: 'deltaBackdropIn 0.25s ease-out' }}
        >
          <div
            ref={containerRef}
            className={cn(
              'glass-strong overflow-hidden elev-3',
              maximized
                ? 'fixed inset-0 rounded-none'
                : 'w-full max-w-[1280px] h-[88vh] max-h-[860px] rounded-2xl'
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'deltaTheaterIn 0.32s cubic-bezier(0.22,1,0.36,1)' }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Now playing: ${theater.video.title}`}
              tabIndex={-1}
              ref={modalRef}
              className="flex h-full outline-none"
            >
              {/* Player area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Stage */}
                <div
                  className={cn(
                    'relative flex-1 bg-gradient-to-br grid place-items-center overflow-hidden min-h-0'
                  , SUBJECT_POSTER[theater.video.subjectId])}
                >
                  {/* cinematic vignette + sheen */}
                  <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.14),transparent_60%)]" />
                  <span className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(0,0,0,0.5),transparent_60%)]" />

                  {/* Center play / pause */}
                  <button
                    type="button"
                    onClick={() => theater.setPlaying((p) => !p)}
                    aria-label={theater.playing ? 'Pause' : 'Play'}
                    className={cn(
                      'relative grid place-items-center size-20 rounded-full',
                      'bg-black/35 backdrop-blur-md border border-white/20',
                      'hover:scale-105 hover:bg-black/45 active:scale-95',
                      'transition-all duration-300'
                    )}
                    style={{
                      animation: theater.playing ? undefined : 'deltaPlayPulse 1.8s ease-out infinite',
                    }}
                  >
                    {theater.playing ? (
                      <Pause className="size-8 fill-current text-white" />
                    ) : (
                      <Play className="size-8 fill-current text-white translate-x-0.5" />
                    )}
                  </button>

                  {/* Top-left subject + chapter label */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 text-white/85">
                    <span className="px-2 py-1 rounded-md bg-black/30 backdrop-blur-sm text-[11px] font-medium uppercase tracking-wide">
                      {content.subjects.find((s) => s.id === theater.video!.subjectId)?.name}
                    </span>
                    <span className="hidden sm:inline px-2 py-1 rounded-md bg-black/30 backdrop-blur-sm text-[11px] text-white/70 max-w-[260px] truncate">
                      {chapterTitleOf(theaterVideoId, content.videos, content.chapters)}
                    </span>
                  </div>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => closeTheater()}
                    aria-label="Close player"
                    className="absolute top-4 right-4 grid place-items-center size-9 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white hover:bg-black/55 hover:scale-105 transition-all"
                  >
                    <X className="size-4" />
                  </button>

                  {/* Complete badge bottom-left */}
                  {videoProgress[theaterVideoId]?.completed && (
                    <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/85 text-primary-foreground text-[11px] font-medium">
                      <Check className="size-3.5" /> Completed
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="p-4 space-y-3 border-t border-border bg-card/70 backdrop-blur-md">
                  <Seekbar
                    fraction={theater.fraction}
                    duration={theater.video.durationSec}
                    onSeek={(f) => useStore.getState().setVideoProgress(theaterVideoId, f)}
                  />

                  {/* Controls row */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Left: playback */}
                    <div className="flex items-center gap-1">
                      <CtrlButton
                        onClick={() =>
                          useStore.getState().setVideoProgress(
                            theaterVideoId,
                            Math.max(0, theater.fraction - 10 / theater.video!.durationSec)
                          )
                        }
                        label="Rewind 10 seconds (←)"
                      >
                        <SkipBack className="size-4" />
                      </CtrlButton>
                      <CtrlButton
                        onClick={() => theater.setPlaying((p) => !p)}
                        label={theater.playing ? 'Pause (Space)' : 'Play (Space)'}
                        active
                        className="size-10"
                      >
                        {theater.playing ? (
                          <Pause className="size-5 fill-current" />
                        ) : (
                          <Play className="size-5 fill-current translate-x-0.5" />
                        )}
                      </CtrlButton>
                      <CtrlButton
                        onClick={() =>
                          useStore.getState().setVideoProgress(
                            theaterVideoId,
                            Math.min(1, theater.fraction + 10 / theater.video!.durationSec)
                          )
                        }
                        label="Forward 10 seconds (→)"
                      >
                        <SkipForward className="size-4" />
                      </CtrlButton>
                    </div>

                    {/* Center: time */}
                    <div className="flex-1 text-center min-w-0">
                      <span className="text-xs tabular text-muted-foreground">
                        <span className="text-foreground font-medium">
                          {fmtDuration(Math.round(theater.fraction * theater.video.durationSec))}
                        </span>
                        <span className="mx-1.5 opacity-50">/</span>
                        {fmtDuration(theater.video.durationSec)}
                      </span>
                    </div>

                    {/* Right: speed / volume / pip / fullscreen */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={cycleSpeed}
                        aria-label={`Playback speed ${theater.speed}x`}
                        title="Cycle playback speed"
                        className="flex items-center gap-1 rounded-full bg-white/5 border border-border px-2.5 py-1.5 text-xs tabular text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                      >
                        <Gauge className="size-3.5" />
                        <span>{theater.speed}x</span>
                      </button>
                      <CtrlButton
                        onClick={() => setMuted((m) => !m)}
                        label={muted ? 'Unmute' : 'Mute'}
                      >
                        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </CtrlButton>
                      <CtrlButton onClick={enterPip} label="Picture in picture">
                        <PictureInPicture2 className="size-4" />
                      </CtrlButton>
                      <CtrlButton
                        onClick={toggleFullscreen}
                        label={maximized ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
                      >
                        {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                      </CtrlButton>
                    </div>
                  </div>

                  {/* Title row + action buttons */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{theater.video.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {theater.video.instructor} · {chapterTitleOf(theaterVideoId, content.videos, content.chapters)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ActionToggle label="Like this lecture" icon={Heart} />
                      <ActionToggle label="Bookmark this lecture" icon={Bookmark} />
                      <ActionToggle label="Download this lecture" icon={Download} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Up Next sidebar */}
              {!maximized && (
                <aside className="hidden md:flex w-72 shrink-0 border-l border-border bg-card/40 flex-col">
                  <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <ListVideo className="size-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">Up Next</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular shrink-0">
                      {queue.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1">
                    {queue.map((v, i) => {
                      const isCurrent = v.id === theaterVideoId
                      const subP = videoProgress[v.id]
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => openTheater(v.id)}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={cn(
                            'w-full flex gap-2.5 rounded-xl p-2 text-left transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                            isCurrent
                              ? 'bg-primary/12 ring-1 ring-primary/25'
                              : 'hover:bg-white/5'
                          )}
                        >
                          <span
                            className={cn(
                              'relative grid place-items-center w-24 h-14 shrink-0 rounded-lg bg-gradient-to-br overflow-hidden',
                              SUBJECT_POSTER[v.subjectId]
                            )}
                          >
                            {isCurrent ? (
                              <span className="flex items-end gap-0.5 h-5">
                                {[0, 1, 2, 3].map((bi) => (
                                  <span
                                    key={bi}
                                    className="w-0.5 bg-primary rounded-full origin-bottom"
                                    style={{
                                      height: '100%',
                                      animation: `deltaEqualize 0.9s ${bi * 0.15}s ease-in-out infinite`,
                                    }}
                                  />
                                ))}
                              </span>
                            ) : (
                              <Play className="size-4 fill-current text-white/85 translate-x-0.5" />
                            )}
                            <span className="absolute bottom-1 right-1 text-[10px] tabular text-white/95 bg-black/45 px-1 rounded">
                              {fmtDuration(v.durationSec)}
                            </span>
                            {subP?.completed && (
                              <span className="absolute top-1 left-1 grid place-items-center size-3.5 rounded-full bg-primary text-primary-foreground">
                                <Check className="size-2.5" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 py-0.5">
                            <span className="block text-xs font-medium line-clamp-2 leading-tight text-pretty">
                              {v.title}
                            </span>
                            <span className="block text-[11px] text-muted-foreground mt-1 truncate">
                              {v.instructor}
                            </span>
                            {isCurrent ? (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                                <span className="size-1.5 rounded-full bg-primary live-dot" />
                                Now playing
                              </span>
                            ) : (
                              <span className="mt-1 inline-flex items-center text-[10px] text-muted-foreground uppercase tracking-wide">
                                {i === 0 ? 'Up next' : 'Queued'}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIP */}
      {pipVideoId && pip.video && (
        <div
          className="fixed bottom-5 right-5 z-[95] w-[320px] max-w-[calc(100vw-2.5rem)] rounded-xl overflow-hidden glass-strong elev-3"
          style={{ animation: 'deltaPipIn 0.32s cubic-bezier(0.22,1,0.36,1)' }}
        >
          <div
            className={cn(
              'relative h-40 bg-gradient-to-br grid place-items-center cursor-pointer overflow-hidden',
              SUBJECT_POSTER[pip.video.subjectId]
            )}
            onClick={restoreFromPip}
            role="button"
            aria-label="Restore picture-in-picture to theater"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                restoreFromPip()
              }
            }}
          >
            <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,255,255,0.12),transparent_60%)]" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                pip.setPlaying((p) => !p)
              }}
              aria-label={pip.playing ? 'Pause' : 'Play'}
              className="grid place-items-center size-12 rounded-full bg-black/35 backdrop-blur-md border border-white/20 hover:scale-105 transition-transform"
            >
              {pip.playing ? (
                <Pause className="size-5 fill-current text-white" />
              ) : (
                <Play className="size-5 fill-current text-white translate-x-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                closePip()
              }}
              aria-label="Close picture-in-picture"
              className="absolute top-2 right-2 grid place-items-center size-7 rounded-full bg-black/45 backdrop-blur-sm text-white hover:bg-black/65 transition-colors"
            >
              <X className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                restoreFromPip()
              }}
              aria-label="Restore to theater"
              title="Restore to theater"
              className="absolute top-2 left-2 grid place-items-center size-7 rounded-full bg-black/45 backdrop-blur-sm text-white hover:bg-black/65 transition-colors"
            >
              <Maximize2 className="size-3.5" />
            </button>
            {/* progress bar */}
            <span className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
              <span
                className="block h-full bg-primary transition-[width] duration-300"
                style={{ width: `${pip.fraction * 100}%` }}
              />
            </span>
          </div>
          <div className="p-3">
            <p className="text-xs font-medium truncate">{pip.video.title}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {pip.video.instructor} · {fmtDuration(Math.round(pip.fraction * pip.video.durationSec))} / {fmtDuration(pip.video.durationSec)}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
