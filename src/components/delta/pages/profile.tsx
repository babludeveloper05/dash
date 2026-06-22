'use client'

import {
  Flame, Clock, Trophy, Target, Award, MapPin, Calendar, Pencil, Atom,
  FlaskConical, Sigma, TrendingUp, BookOpen, GraduationCap,
  ArrowRight, Footprints, Zap, Swords, Moon, Medal, Sparkles, Dna, Cpu,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  GlassCard, ProgressRing, Avatar, GhostButton,
} from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { useStore, useSubjectProgress, useTotalHours } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import type { Achievement } from '@/lib/types'
import { cn } from '@/lib/utils'
import { fmtAgo } from '@/lib/format'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const ACT_ICON: Partial<Record<string, LucideIcon>> = {
  video: BookOpen,
  test: Target,
  note: Pencil,
  live: Flame,
  streak: TrendingUp,
  badge: Award,
}

const ACH_ICON: Partial<Record<string, LucideIcon>> = {
  Footprints, Flame, Zap, Target, Swords, Moon, Medal, Sparkles,
  Atom, FlaskConical, Sigma, Trophy,
}

const SUBJECT_ICON: Record<string, LucideIcon> = {
  Atom, FlaskConical, Sigma, Dna, Cpu, BookOpen,
}

// Warm-only rarity tones (no indigo / blue) — amber / orange / zinc gradient.
const RARITY_TONE: Record<string, string> = {
  Common: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
  Rare: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  Epic: 'text-orange-300 bg-orange-500/15 border-orange-500/25',
  Legendary: 'text-amber-200 bg-amber-400/20 border-amber-400/30',
}

export function ProfilePage() {
  const streak = useStore((s) => s.streak)
  const totalHours = useTotalHours()
  const history = useStore((s) => s.history)
  const subjectProgress = useSubjectProgress()
  const setTab = useStore((s) => s.setTab)
  const profile = useStore((s) => s.profile)
  const reduce = useReducedMotion() ?? false
  const content = useContent()
  const you = { rank: 0, score: 0, name: 'You', batch: '', streak: 0, change: 0, id: '' }
  const earned = content.achievements.filter((a) => a.earned)
  const testsTaken = history.length

  return (
    <ScaledPage>
      <motion.div
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        <GhostButton onClick={() => setTab('settings')}>
          <Pencil className="size-3.5" /> Edit profile
        </GhostButton>
      </motion.div>

      <motion.div
        variants={staggerContainer(reduce)}
        className="px-5 pb-6 grid grid-cols-1 @lg:grid-cols-2 gap-5 items-start"
      >
        {/* LEFT: hero + stats + achievements preview */}
        <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex flex-col gap-5 min-w-0">
          <HeroCard
            name={profile.name}
            bio={profile.bio}
            examName={profile.examName}
            targetYear={profile.targetYear}
            batch={profile.batch}
            location={profile.location}
            streak={streak}
            rank={you?.rank}
            onEdit={() => setTab('settings')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Stat
              icon={<Flame className="size-5 text-amber-300" />}
              value={`${streak}`}
              label="Day streak"
            />
            <Stat
              icon={<Clock className="size-5 text-primary" />}
              value={`${totalHours}h`}
              label="Total hours"
            />
            <Stat
              icon={<Target className="size-5 text-emerald-300" />}
              value={`${testsTaken}`}
              label="Tests taken"
            />
            <Stat
              icon={<Trophy className="size-5 text-amber-300" />}
              value={you ? `#${you.rank}` : '—'}
              label="Batch rank"
            />
          </div>

          <AchievementsPreview
            earned={earned}
            totalEarned={earned.length}
            totalCount={content.achievements.length}
            onViewAll={() => setTab('achievements')}
          />
        </motion.div>

        {/* RIGHT: subject mastery + recent activity */}
        <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex flex-col gap-5 min-w-0">
          <SubjectMastery subjectProgress={subjectProgress} subjects={content.subjects} />
          <RecentActivity />
        </motion.div>
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero card                                                          */
/* ------------------------------------------------------------------ */

function HeroCard({
  name, bio, examName, targetYear, batch, location, streak, rank, onEdit,
}: {
  name: string
  bio: string
  examName: string
  targetYear: string
  batch: string
  location: string
  streak: number
  rank?: number
  onEdit: () => void
}) {
  return (
    <GlassCard strong className="relative overflow-hidden p-6">
      <div
        aria-hidden
        className="absolute -top-16 -right-12 size-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"
      />
      <div className="relative flex items-start gap-5 flex-wrap">
        <div className="relative shrink-0">
          <div className="rounded-full p-[3px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700">
            <div className="rounded-full bg-background p-1">
              <Avatar name={name} size={80} />
            </div>
          </div>
          {rank !== undefined && (
            <span className="absolute -bottom-1.5 -right-1.5 grid place-items-center min-w-7 h-7 px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-bold border-2 border-background tabular">
              #{rank}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight text-gradient-warm">
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <Chip icon={<GraduationCap className="size-3 text-primary" />}>
              {examName} · {targetYear}
            </Chip>
            <Chip icon={<MapPin className="size-3 text-primary" />}>
              {location}
            </Chip>
            <Chip icon={<Calendar className="size-3 text-primary" />}>
              {batch}
            </Chip>
            <Chip active icon={<Flame className="size-3" />}>
              {streak}d streak
            </Chip>
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-pretty max-w-md">
            {bio}
          </p>
        </div>

        <GhostButton onClick={onEdit} className="self-start">
          <Pencil className="size-3.5" /> Edit
        </GhostButton>
      </div>
    </GlassCard>
  )
}

function Chip({
  icon, children, active,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
        active
          ? 'bg-primary/15 text-primary border-primary/25'
          : 'bg-white/[0.04] text-muted-foreground border-border'
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function Stat({
  icon, value, label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <GlassCard className="p-4 flex items-center gap-3" hover>
      <span className="grid place-items-center size-11 rounded-xl bg-white/[0.04] border border-border shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-light tabular leading-none truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Subject mastery                                                    */
/* ------------------------------------------------------------------ */

function SubjectMastery({
  subjectProgress,
  subjects,
}: {
  subjectProgress: Record<string, number>
  subjects: { id: string; name: string; color: string; icon: string }[]
}) {
  const safeSubjects = (subjects || []).slice(0, 6)
  const avg = safeSubjects.length > 0
    ? safeSubjects.reduce((acc, s) => acc + (subjectProgress[s.id] ?? 0), 0) / safeSubjects.length
    : 0

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Subject Mastery</p>
          <p className="text-[11px] text-muted-foreground">
            Completion across all enrolled subjects
          </p>
        </div>
        <ProgressRing value={avg} size={44} stroke={4} valueClass="text-primary">
          <span className="text-[10px] tabular font-medium">{Math.round(avg * 100)}%</span>
        </ProgressRing>
      </div>
      <div className="grid grid-cols-2 @sm:grid-cols-3 gap-3">
        {safeSubjects.map((s) => {
          const v = subjectProgress[s.id] ?? 0
          const Icon = SUBJECT_ICON[s.icon] ?? Atom
          return (
            <div
              key={s.id}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.02] border border-border/60 p-3"
            >
              <ProgressRing value={v} size={64} stroke={6} valueClass="text-primary">
                <span className="text-xs tabular font-medium">{Math.round(v * 100)}%</span>
              </ProgressRing>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="size-3" /> {s.name}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Recent activity                                                    */
/* ------------------------------------------------------------------ */

function RecentActivity() {
  const items = [] as { id: string; label: string; type: string; minutesAgo: number }[]; // TODO: activity from API(0, 9)
  return (
    <GlassCard className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium">Recent Activity</p>
          <p className="text-[11px] text-muted-foreground">Your latest moves</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-primary">
          <span className="size-1.5 rounded-full bg-primary live-dot" aria-hidden />
          Live
        </span>
      </div>
      <div className="relative flex-1 min-h-0 overflow-y-auto scroll-thin pr-1">
        <div
          aria-hidden
          className="absolute left-4 top-2 bottom-2 w-px bg-border"
        />
        <ul className="space-y-3">
          {items.map((a) => {
            const Icon = ACT_ICON[a.type] ?? BookOpen
            return (
              <li key={a.id} className="relative flex items-start gap-3">
                <span className="relative z-10 grid place-items-center size-8 rounded-full bg-background border border-border shrink-0">
                  <Icon className="size-3.5 text-primary" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs leading-snug text-pretty">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular">
                    {fmtAgo(a.minutesAgo)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Achievements preview                                               */
/* ------------------------------------------------------------------ */

function AchievementsPreview({
  earned, totalEarned, totalCount, onViewAll,
}: {
  earned: Achievement[]
  totalEarned: number
  totalCount: number
  onViewAll: () => void
}) {
  const top = earned.slice(0, 6)
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium">Achievements</p>
          <p className="text-[11px] text-muted-foreground">
            {totalEarned} of {totalCount} unlocked
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-full"
        >
          View all <ArrowRight className="size-3" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
        {top.map((a) => {
          const Icon = ACH_ICON[a.icon] ?? Award
          const tone = RARITY_TONE[a.rarity] ?? RARITY_TONE.Common
          return (
            <div
              key={a.id}
              className="shrink-0 w-32 rounded-xl border border-border/60 bg-white/[0.02] p-3"
            >
              <span
                className={cn(
                  'inline-grid place-items-center size-10 rounded-lg border mb-2',
                  tone
                )}
              >
                <Icon className="size-5" />
              </span>
              <p className="text-[11px] font-medium truncate">{a.title}</p>
              <p className="text-[10px] text-muted-foreground tabular">{a.earnedAt}</p>
            </div>
          )
        })}
        {top.length === 0 && (
          <p className="text-xs text-muted-foreground py-4">
            No achievements unlocked yet — keep studying!
          </p>
        )}
      </div>
    </GlassCard>
  )
}
