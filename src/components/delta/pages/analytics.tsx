'use client'

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart,
  Bar, BarChart, CartesianGrid, Cell,
} from 'recharts'
import { Clock, TrendingUp, Flame, Target, Award, Activity, BookOpen } from 'lucide-react'
import { GlassCard, MetricCard, PageSkeleton, ErrorState } from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { useStore, useSubjectProgress, useTotalHours } from '@/lib/store'
import { useContent } from '@/hooks/use-content'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

interface TipPayload {
  value?: number
  name?: string
  payload?: Record<string, unknown>
}

interface TipProps {
  active?: boolean
  payload?: TipPayload[]
  label?: string | number
}

export function AnalyticsPage() {
  const subjectProgress = useSubjectProgress()
  const totalHours = useTotalHours()
  const streak = useStore((s) => s.streak)
  const history = useStore((s) => s.history)
  const reduce = useReducedMotion() ?? false
  const content = useContent()
  const { subjects, studyHours } = content

  const avgScore = useMemo(() => {
    if (!history.length) return 0
    return Math.round(history.reduce((a, h) => a + (h.score / h.total) * 100, 0) / history.length)
  }, [history])

  const subjectBars = useMemo(
    () =>
      subjects.slice(0, 6).map((s) => ({
        subject: s.name,
        short: s.name.length > 7 ? s.name.slice(0, 4) : s.name.slice(0, 4),
        value: Math.round((subjectProgress[s.id] ?? 0) * 100),
        fill: s.color,
      })),
    [subjectProgress, subjects]
  )

  const scoreData = useMemo(
    () =>
      history.slice(0, 12).reverse().map((h, i) => ({
        test: `T${i + 1}`,
        score: Math.round((h.score / h.total) * 100),
      })),
    [history]
  )

  // 7-day rolling study-hour delta vs previous 7 days
  const hoursTrend = useMemo(() => {
    if (studyHours.length < 14) return 0
    const recent = studyHours.slice(-7).reduce((a, h) => a + h.hours, 0)
    const prev = studyHours.slice(-14, -7).reduce((a, h) => a + h.hours, 0)
    return Math.round((recent - prev) * 10) / 10
  }, [studyHours])

  // Avg score delta: last 6 vs previous 6
  const scoreTrendDelta = useMemo(() => {
    if (history.length < 8) return 0
    const last = history.slice(0, 6)
    const prev = history.slice(6, 12)
    if (!prev.length) return 0
    const lAvg = Math.round(last.reduce((a, h) => a + (h.score / h.total) * 100, 0) / last.length)
    const pAvg = Math.round(prev.reduce((a, h) => a + (h.score / h.total) * 100, 0) / prev.length)
    return lAvg - pAvg
  }, [history])

  const totalHours30d = useMemo(
    () => Math.round(studyHours.reduce((a, h) => a + h.hours, 0)),
    [studyHours]
  )

  // Show skeleton while loading
  if (content.loading) {
    return <ScaledPage><PageSkeleton variant="charts" /></ScaledPage>
  }

  // Show error state if fetch failed
  if (content.error) {
    return <ScaledPage><ErrorState message={content.error} onRetry={content.refresh} /></ScaledPage>
  }

  return (
    <ScaledPage>
      <motion.div
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      {/*
        Nested stagger container: animates as a unit after the header, then
        cascades its own children (KPIs → charts → mastery) for a layered reveal.
        Under reduced motion this collapses to a flat crossfade.
      */}
      <motion.div
        variants={staggerContainer(reduce)}
        className="px-5 pb-5 pt-5 flex flex-col gap-4"
      >
        {/* KPI row */}
        <motion.div
          variants={staggerItem(reduce)}
          transition={itemTransition(reduce)}
          className="grid grid-cols-2 @lg:grid-cols-4 gap-4"
        >
          <MetricCard
            label="Study Hours"
            icon={<Clock className="size-3.5" />}
            value={`${totalHours.toLocaleString()}h`}
            sub="All-time total"
            trend={{ value: hoursTrend, suffix: 'h' }}
          />
          <MetricCard
            label="Avg Score"
            icon={<Target className="size-3.5" />}
            value={`${avgScore}%`}
            sub="Across recent tests"
            trend={{ value: scoreTrendDelta, suffix: '%' }}
          />
          <MetricCard
            label="Tests Taken"
            icon={<Award className="size-3.5" />}
            value={history.length}
            sub="Lifetime attempts"
          />
          <MetricCard
            label="Current Streak"
            icon={<Flame className="size-3.5" />}
            value={`${streak}d`}
            sub="Best: 31 days"
          />
        </motion.div>

        {/* Charts grid */}
        <motion.div
          variants={staggerItem(reduce)}
          transition={itemTransition(reduce)}
          className="grid grid-cols-1 @lg:grid-cols-2 gap-4"
        >
          {/* Study hours area — spans full width */}
          <GlassCard className="p-5 @lg:col-span-2">
            <ChartHeader
              icon={<Activity className="size-3.5" />}
              title="Daily Study Hours"
              subtitle="Last 30 days"
              right={
                <span className="text-[11px] text-muted-foreground tabular">
                  {totalHours30d}h total
                </span>
              }
            />
            <div className="h-[clamp(200px,32vh,320px)]" role="img" aria-label="Daily study hours over the last 30 days">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={studyHours} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<HoursTip />}
                    cursor={{ stroke: 'var(--chart-1)', strokeOpacity: 0.4, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#hoursFill)"
                    activeDot={{
                      r: 5,
                      fill: 'var(--chart-1)',
                      stroke: 'var(--background)',
                      strokeWidth: 2,
                    }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Score trend */}
          <GlassCard className="p-5">
            <ChartHeader
              icon={<TrendingUp className="size-3.5" />}
              title="Test Score Trend"
              subtitle="Last 12 attempts"
            />
            <div className="h-[clamp(180px,26vh,260px)]" role="img" aria-label="Test score trend over last 12 attempts">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                  <XAxis
                    dataKey="test"
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<ScoreTip />}
                    cursor={{ stroke: 'var(--chart-1)', strokeOpacity: 0.4, strokeDasharray: '3 3' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--chart-1)', strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: 'var(--chart-1)',
                      stroke: 'var(--background)',
                      strokeWidth: 2,
                    }}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Subject completion — horizontal bars */}
          <GlassCard className="p-5">
            <ChartHeader
              icon={<BookOpen className="size-3.5" />}
              title="Subject Completion"
              subtitle="Chapters finished"
            />
            <div className="h-[clamp(180px,26vh,260px)]" role="img" aria-label="Subject completion percentage">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBars} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="short"
                    tick={{ fill: 'oklch(0.66 0.012 72)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<SubjectTip />} cursor={{ fill: 'oklch(1 0 0 / 0.04)' }} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16} animationDuration={900}>
                    {subjectBars.map((b) => (
                      <Cell key={b.subject} fill={b.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Subject mastery */}
        <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)}>
          <GlassCard className="p-5">
            <ChartHeader
              icon={<Target className="size-3.5" />}
              title="Subject Mastery"
              subtitle="Detailed progress per subject"
            />
            <div className="grid grid-cols-1 @md:grid-cols-2 gap-x-8 gap-y-4 mt-1">
              {subjects.slice(0, 6).map((s) => {
                const v = Math.round((subjectProgress[s.id] ?? 0) * 100)
                return (
                  <div key={s.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-xs tabular text-muted-foreground">{v}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${v}%`,
                          background: s.color,
                          boxShadow: `0 0 12px ${s.color}55`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}

function ChartHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="grid place-items-center size-7 rounded-lg bg-primary/12 text-primary border border-primary/15 shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  )
}

function HoursTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  const v = (payload[0]?.value as number) ?? 0
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs elev-2">
      <p className="text-muted-foreground">Day {label}</p>
      <p className="font-medium tabular text-foreground">{v.toFixed(2)}h</p>
    </div>
  )
}

function ScoreTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  const v = (payload[0]?.value as number) ?? 0
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs elev-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium tabular text-foreground">{v}%</p>
    </div>
  )
}

function SubjectTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as { subject?: string; value?: number } | undefined
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs elev-2">
      <p className="text-muted-foreground">{p?.subject}</p>
      <p className="font-medium tabular text-foreground">{p?.value}%</p>
    </div>
  )
}
