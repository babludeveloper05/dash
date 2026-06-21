'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, TrendingUp, TrendingDown, Minus, Flame, Search, ArrowUpRight } from 'lucide-react'
import { GlassCard, Pill, Avatar, PrimaryButton, EmptyState, PageSkeleton } from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { VirtualList } from '@/components/delta/virtual'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const SCOPES = ['All', 'My Batch', 'Cohort', 'Friends'] as const
type Scope = (typeof SCOPES)[number]

const ROW_GRID = 'grid grid-cols-[1.75rem_1fr_3rem_4rem_4rem] @sm:grid-cols-[2.25rem_1fr_4.5rem_5rem_5rem] gap-3'

interface LeaderEntry {
  id: string; name: string; score: number; streak: number
  change: number; batch: string; rank: number; you?: boolean
}

export function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('All')
  const [query, setQuery] = useState('')
  const [apiData, setApiData] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const reduce = useReducedMotion() ?? false

  // Fetch real leaderboard from the API.
  // The endpoint returns a paginated response { items, total, limit, offset };
  // extract .items for the page. Falls back to the array itself if the
  // response shape is ever a plain array (back-compat).
  useEffect(() => {
    fetch('/api/community/leaderboard?limit=500')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : (data?.items ?? [])
        setApiData(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Use API data if available, mark "You" entry
  const leaderboard = useMemo(() => {
    return apiData.map(l => ({ ...l, you: l.name === 'You' }))
  }, [apiData])

  const me = useMemo(() => leaderboard.find((l) => l.you) ?? leaderboard[0] ?? { batch: '', name: 'You', score: 0, streak: 0, rank: 0, change: 0, id: '' }, [leaderboard])

  const list = useMemo(() => {
    let base = leaderboard
    if (scope === 'My Batch') {
      base = leaderboard
        .filter((l) => l.batch === me.batch)
        .map((l, i) => ({ ...l, rank: i + 1 }))
    }
    if (scope === 'Cohort') {
      base = leaderboard.slice(0, 100)
    }
    if (scope === 'Friends') {
      base = []
    }
    if (query.trim()) {
      base = base.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    }
    return base
  }, [scope, query, me])

  // Show skeleton while loading and no data yet
  if (loading && apiData.length === 0) {
    return <ScaledPage><PageSkeleton variant="list" /></ScaledPage>
  }

  const podium = list.slice(0, 3)
  // Visual order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [podium[1], podium[0], podium[2]]
  const showPodium = !query && scope !== 'Friends' && podium.length === 3

  return (
    <ScaledPage>
      <motion.div
        className="flex flex-col"
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {SCOPES.map((s) => (
            <Pill key={s} active={scope === s} onClick={() => setScope(s)}>
              {s}
            </Pill>
          ))}
        </div>
      </motion.div>

      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 pb-6 flex flex-col gap-4 flex-1 min-h-0">
        {/* Podium */}
        {showPodium && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {podiumOrder.map((p) => {
              if (!p) return <div key="empty" />
              const isFirst = p.rank === 1
              const isSecond = p.rank === 2
              return (
                <GlassCard
                  key={p.id}
                  strong={isFirst}
                  className={cn(
                    'p-4 flex flex-col items-center text-center gap-3 relative overflow-hidden',
                    isFirst && 'order-2 -mt-2 border-amber-400/40',
                    isSecond && 'order-1 mt-6',
                    p.rank === 3 && 'order-3 mt-8'
                  )}
                >
                  {isFirst && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/12 via-transparent to-transparent pointer-events-none" />
                      <Crown
                        className="size-6 text-amber-300 absolute -top-3 left-1/2 -translate-x-1/2"
                        style={{ filter: 'drop-shadow(0 4px 8px rgba(245,158,11,0.45))' }}
                      />
                    </>
                  )}
                  <div className="relative">
                    <Avatar
                      name={p.name}
                      size={isFirst ? 64 : 52}
                      className={cn(isFirst && 'ring-2 ring-amber-400/60 ring-offset-2 ring-offset-background')}
                    />
                    <span
                      className={cn(
                        'absolute -bottom-1 -right-1 grid place-items-center rounded-full text-[10px] font-bold tabular size-6 border-2 border-background',
                        isFirst
                          ? 'bg-amber-400 text-black'
                          : isSecond
                            ? 'bg-cream text-cream-foreground'
                            : 'bg-orange-700/60 text-orange-100'
                      )}
                    >
                      {p.rank}
                    </span>
                  </div>
                  <div className="relative min-w-0">
                    <p className="text-sm font-medium truncate max-w-[140px]">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.batch}</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold tabular relative',
                      isFirst
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/5 border border-border text-foreground'
                    )}
                  >
                    {p.score.toLocaleString()} pts
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}

        {/* Your rank highlight */}
        <GlassCard strong className="p-4 border-primary/30 flex items-center gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-[64px]">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Your Rank</span>
            <span className="text-3xl font-light tabular text-primary leading-none">#{me.rank}</span>
          </div>
          <div className="h-12 w-px bg-border shrink-0 hidden @sm:block" />
          <Avatar
            name={me.name}
            size={42}
            className="ring-2 ring-primary/40 ring-offset-2 ring-offset-background shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {me.name} <span className="text-[11px] text-primary font-normal">(You)</span>
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Flame className="size-3 text-amber-300" /> {me.streak}d streak
              </span>
              <span>·</span>
              <span className="truncate">{me.batch}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-light tabular leading-none">{me.score.toLocaleString()}</p>
            {me.change >= 0 ? (
              <p className="text-[11px] text-emerald-300 flex items-center gap-1 justify-end mt-1">
                <TrendingUp className="size-3" /> +{me.change} this week
              </p>
            ) : (
              <p className="text-[11px] text-red-300 flex items-center gap-1 justify-end mt-1">
                <TrendingDown className="size-3" /> {me.change} this week
              </p>
            )}
          </div>
          <PrimaryButton className="shrink-0 hidden @md:inline-flex">
            <ArrowUpRight className="size-3.5" /> Jump to rank
          </PrimaryButton>
        </GlassCard>

        {/* Full list */}
        <GlassCard className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-3 border-b border-border relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search learners..."
              aria-label="Search learners"
              className="w-full rounded-full bg-white/5 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-colors placeholder:text-muted-foreground/70"
            />
          </div>
          <div className={cn(ROW_GRID, 'px-4 py-2 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground font-medium')}>
            <span className="text-center">#</span>
            <span>Learner</span>
            <span className="text-center">Streak</span>
            <span className="text-right">Score</span>
            <span className="text-right">Δ</span>
          </div>
          <VirtualList
            items={list}
            itemHeight={52}
            maxHeight="min(60vh, 520px)"
            emptyState={
              <div className="min-h-[280px] grid place-items-center">
                <EmptyState
                  icon={<Search className="size-6" />}
                  title={scope === 'Friends' ? 'No friends added yet' : 'No matches found'}
                  hint={
                    scope === 'Friends'
                      ? 'Add study partners from a profile to track them here.'
                      : 'Try a different name or scope filter.'
                  }
                />
              </div>
            }
            renderItem={(l) => (
              <div
                key={l.id}
                className={cn(
                  ROW_GRID,
                  'items-center px-4 py-2.5 border-b border-border/40 transition-colors',
                  l.you ? 'bg-primary/10' : 'hover:bg-white/[0.03]'
                )}
              >
                <span
                  className={cn(
                    'text-sm tabular text-center',
                    l.rank <= 3 ? 'text-amber-300 font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {l.rank}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={l.name} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {l.name}
                      {l.you && <span className="text-[11px] text-primary ml-1">(You)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{l.batch}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground justify-center tabular">
                  <Flame className="size-3 text-amber-300/70" />
                  {l.streak}
                </span>
                <span className="text-right text-sm font-medium tabular">
                  {l.score.toLocaleString()}
                </span>
                <span className="text-right">
                  {l.change > 0 ? (
                    <span className="text-[11px] text-emerald-300 flex items-center gap-0.5 justify-end tabular">
                      <TrendingUp className="size-3" />
                      {l.change}
                    </span>
                  ) : l.change < 0 ? (
                    <span className="text-[11px] text-red-300 flex items-center gap-0.5 justify-end tabular">
                      <TrendingDown className="size-3" />
                      {Math.abs(l.change)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground flex justify-end">
                      <Minus className="size-3" />
                    </span>
                  )}
                </span>
              </div>
            )}
          />
        </GlassCard>
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}
