'use client'

import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GlassCard, Badge } from './ui'

/* ------------------------------------------------------------------ */
/*  <DataCard> — thumbnail + title + meta + action                     */
/*                                                                     */
/*  Replaces VideoCard (library), TestCard (tests), NoteCard (notes) — */
/*  all three are "thumbnail/icon + title + meta tags + action".       */
/*  One parameterized card with optional slots.                        */
/* ------------------------------------------------------------------ */

export function DataCard({
  thumbnail,
  icon,
  title,
  titleClassName = 'line-clamp-2',
  meta,
  badges,
  stats,
  action,
  onClick,
  className,
  children,
}: {
  /** Full-bleed thumbnail/media area (e.g. video poster). */
  thumbnail?: ReactNode
  /** Icon shown in a rounded square (alternative to thumbnail). */
  icon?: ReactNode
  title: ReactNode
  titleClassName?: string
  /** Meta row under the title (instructor + chapter, etc.). */
  meta?: ReactNode
  /** Badge row (type, subject, difficulty). */
  badges?: ReactNode
  /** Stats row (question count, duration, etc.). */
  stats?: ReactNode
  /** Action button / CTA. */
  action?: ReactNode
  onClick?: () => void
  className?: string
  children?: ReactNode
}) {
  return (
    <GlassCard
      hover={!!onClick}
      className={cn('flex flex-col gap-3 group transition-all duration-300 overflow-hidden', onClick && 'hover:elev-2 hover:-translate-y-0.5', className)}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full text-left focus-visible:outline-none"
          aria-label={typeof title === 'string' ? title : undefined}
        >
          {thumbnail && <CardThumbnail>{thumbnail}</CardThumbnail>}
          {icon && !thumbnail && <CardIcon>{icon}</CardIcon>}
          <CardBody title={title} titleClassName={titleClassName} meta={meta} badges={badges} stats={stats} />
        </button>
      ) : (
        <>
          {thumbnail && <CardThumbnail>{thumbnail}</CardThumbnail>}
          {icon && !thumbnail && <CardIcon>{icon}</CardIcon>}
          <CardBody title={title} titleClassName={titleClassName} meta={meta} badges={badges} stats={stats} />
        </>
      )}
      {children}
      {action && <div className="mt-auto">{action}</div>}
    </GlassCard>
  )
}

function CardThumbnail({ children }: { children: ReactNode }) {
  return <div className="relative -mx-0 -mt-0 overflow-hidden">{children}</div>
}

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="grid place-items-center size-10 rounded-xl bg-primary/12 text-primary border border-primary/15 shrink-0">
        {children}
      </span>
    </div>
  )
}

function CardBody({
  title,
  titleClassName,
  meta,
  badges,
  stats,
}: {
  title: ReactNode
  titleClassName: string
  meta?: ReactNode
  badges?: ReactNode
  stats?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className={cn('text-sm font-semibold leading-snug text-pretty', titleClassName)}>{title}</p>
      {badges && <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">{badges}</div>}
      {meta && <div className="mt-2 text-[11px] text-muted-foreground">{meta}</div>}
      {stats && <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground tabular">{stats}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  <StatBlock> — label + value + sub + icon + trend                   */
/*                                                                     */
/*  Replaces Stat (profile), StatTile (achievements), SummaryStat      */
/*  (syllabus), ResultStat (tests), MetricCard (ui) — five stat        */
/*  components consolidated into one.                                  */
/* ------------------------------------------------------------------ */

export function StatBlock({
  label,
  value,
  sub,
  icon,
  trend,
  className,
  onClick,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  trend?: { value: number; suffix?: string }
  className?: string
  onClick?: () => void
}) {
  return (
    <GlassCard
      hover={!!onClick}
      onClick={onClick}
      className={cn('p-4 flex items-center gap-3.5', className)}
    >
      {icon && (
        <span className="grid place-items-center size-10 rounded-xl bg-primary/12 text-primary border border-primary/15 shrink-0">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 truncate font-medium">{label}</p>
        <p className="text-lg font-semibold tabular leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span
          className={cn(
            'text-[11px] tabular font-medium shrink-0',
            trend.value > 0 ? 'text-emerald-300' : trend.value < 0 ? 'text-red-300' : 'text-muted-foreground'
          )}
        >
          {trend.value > 0 ? '+' : ''}{trend.value}{trend.suffix ?? ''}
        </span>
      )}
    </GlassCard>
  )
}
