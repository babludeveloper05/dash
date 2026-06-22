'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Footprints, Flame, Zap, Shield, Target, Crown, Swords, Atom, FlaskConical,
  Sigma, Trophy, Moon, Sunrise, Medal, Sparkles, MessageCircleQuestion,
  Lock, Check,
} from 'lucide-react'
import { GlassCard, Pill, ProgressRing } from '@/components/delta/ui'
import { ScaledPage } from '@/components/delta/scaled-page'
import { useContent } from '@/hooks/use-content'
import type { Achievement } from '@/lib/types'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, itemTransition } from '@/lib/motion'

const ICONS: Record<string, LucideIcon> = {
  Footprints, Flame, Zap, Shield, Target, Crown, Swords, Atom, FlaskConical,
  Sigma, Trophy, Moon, Sunrise, Medal, Sparkles, MessageCircleQuestion,
}

type Rarity = Achievement['rarity']

interface RarityStyle {
  badge: string
  iconWrap: string
  iconColor: string
  glow: string
  accent: string
}

const RARITY: Record<Rarity, RarityStyle> = {
  Common: {
    badge: 'bg-white/5 text-zinc-300 border-zinc-500/20',
    iconWrap: 'bg-white/5',
    iconColor: 'text-zinc-200',
    glow: '',
    accent: 'text-zinc-400',
  },
  Rare: {
    badge: 'bg-primary/12 text-primary border-primary/25',
    iconWrap: 'bg-primary/12',
    iconColor: 'text-primary',
    glow: 'shadow-[0_0_24px_-6px_var(--primary)]',
    accent: 'text-primary',
  },
  Epic: {
    badge: 'bg-warning/12 text-warning border-warning/25',
    iconWrap: 'bg-warning/12',
    iconColor: 'text-warning',
    glow: 'shadow-[0_0_24px_-6px_var(--warning)]',
    accent: 'text-warning',
  },
  Legendary: {
    badge: 'bg-gradient-to-r from-amber-400/20 to-cream/20 text-amber-200 border-amber-300/30',
    iconWrap: 'bg-gradient-to-br from-amber-400/20 to-cream/10',
    iconColor: 'text-amber-200',
    glow: 'shadow-[0_0_28px_-4px_oklch(0.78_0.13_75)]',
    accent: 'text-amber-200',
  },
}

const CATEGORIES = ['All', 'Study Streak', 'Test Mastery', 'Subject Expert', 'Special'] as const
type Category = (typeof CATEGORIES)[number]
const RARITIES = ['All', 'Common', 'Rare', 'Epic', 'Legendary'] as const
type RarityFilter = (typeof RARITIES)[number]

export function AchievementsPage() {
  const [cat, setCat] = useState<Category>('All')
  const [rarity, setRarity] = useState<RarityFilter>('All')
  const reduce = useReducedMotion() ?? false

  const content = useContent(); const earnedCount = content.achievements.filter((a) => a.earned).length
  const rarityCounts = useMemo(
    () => ({
      Rare: content.achievements.filter((a) => a.rarity === 'Rare' && a.earned).length,
      Epic: content.achievements.filter((a) => a.rarity === 'Epic' && a.earned).length,
      Legendary: content.achievements.filter((a) => a.rarity === 'Legendary' && a.earned).length,
    }),
    []
  )

  const filtered = useMemo(
    () =>
      content.achievements.filter((a) => {
        if (cat !== 'All' && a.category !== cat) return false
        if (rarity !== 'All' && a.rarity !== rarity) return false
        return true
      }),
    [cat, rarity]
  )

  return (
    <ScaledPage>
      <motion.div
        className="flex flex-col"
        variants={staggerContainer(reduce)}
        initial="initial"
        animate="animate"
      >
      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="flex items-center justify-end gap-2 px-5 pt-5">
        <ProgressRing
          value={earnedCount / content.achievements.length}
          size={44}
          stroke={4}
          valueClass="text-primary"
        >
          <span className="text-[10px] tabular font-medium">
            {Math.round((earnedCount / content.achievements.length) * 100)}%
          </span>
        </ProgressRing>
      </motion.div>

      <motion.div variants={staggerItem(reduce)} transition={itemTransition(reduce)} className="px-5 pb-6 flex flex-col gap-4 flex-1 min-h-0">
        {/* Stat row */}
        <div className="grid grid-cols-2 @sm:grid-cols-4 gap-3">
          <StatTile
            label="Earned"
            value={earnedCount}
            icon={<Check className="size-3.5" strokeWidth={3} />}
            tone="text-emerald-300"
            ring="ring-emerald-500/20"
          />
          <StatTile
            label="Rare"
            value={rarityCounts.Rare}
            icon={<Zap className="size-3.5" />}
            tone="text-primary"
            ring="ring-primary/20"
          />
          <StatTile
            label="Epic"
            value={rarityCounts.Epic}
            icon={<Crown className="size-3.5" />}
            tone="text-warning"
            ring="ring-warning/20"
          />
          <StatTile
            label="Legendary"
            value={rarityCounts.Legendary}
            icon={<Sparkles className="size-3.5" />}
            tone="text-amber-200"
            ring="ring-amber-400/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1 font-medium">
              Category
            </span>
            {CATEGORIES.map((c) => (
              <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </Pill>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1 font-medium">
              Rarity
            </span>
            {RARITIES.map((r) => (
              <Pill key={r} active={rarity === r} onClick={() => setRarity(r)}>
                {r}
              </Pill>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto scroll-thin pr-1 -mr-1">
          <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4 pb-1">
            {filtered.map((a) => {
              const Icon = ICONS[a.icon] ?? Trophy
              const r = RARITY[a.rarity]
              const progress = Math.round(a.progress * 100)
              return (
                <GlassCard
                  key={a.id}
                  hover
                  className={cn(
                    'p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300',
                    !a.earned && 'opacity-85 hover:opacity-100'
                  )}
                >
                  {a.earned && r.glow && (
                    <div className={cn('absolute inset-0 pointer-events-none opacity-50', r.glow)} />
                  )}
                  {a.rarity === 'Legendary' && a.earned && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/8 via-transparent to-cream/8 pointer-events-none" />
                  )}

                  <div className="flex items-start justify-between relative">
                    <span
                      className={cn(
                        'grid place-items-center size-14 rounded-2xl relative transition-all',
                        a.earned ? cn(r.iconWrap, r.iconColor) : 'bg-white/5'
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-7 transition-all',
                          a.earned ? r.iconColor : 'text-muted-foreground opacity-70'
                        )}
                      />
                      {!a.earned && (
                        <span className="absolute -bottom-1 -right-1 grid place-items-center size-5 rounded-full bg-card border border-border">
                          <Lock className="size-2.5 text-muted-foreground" />
                        </span>
                      )}
                      {a.earned && (
                        <span className="absolute -bottom-1 -right-1 grid place-items-center size-5 rounded-full bg-emerald-500 text-white">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                        r.badge
                      )}
                    >
                      {a.rarity}
                    </span>
                  </div>

                  <div className="relative">
                    <p className="text-sm font-medium leading-snug">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed text-pretty">
                      {a.description}
                    </p>
                  </div>

                  {a.earned ? (
                    <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <Check className="size-3" strokeWidth={3} />
                      <span>Unlocked {a.earnedAt}</span>
                    </div>
                  ) : (
                    <div className="mt-auto pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <span>Progress</span>
                        <span className="tabular font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </div>
      </motion.div>
      </motion.div>
    </ScaledPage>
  )
}

function StatTile({
  label,
  value,
  icon,
  tone,
  ring,
}: {
  label: string
  value: number
  icon: ReactNode
  tone: string
  ring: string
}) {
  return (
    <GlassCard className={cn('p-3.5 flex flex-col gap-1.5 ring-1', ring)}>
      <span className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium', tone)}>
        {icon}
        {label}
      </span>
      <span className="text-2xl font-light tabular leading-none">{value}</span>
    </GlassCard>
  )
}
