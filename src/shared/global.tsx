'use client'

import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GlassCard, EmptyState, Segmented, Pill } from './ui'
import { Search, X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  <ScrollArea> — bounded scroll container                            */
/*                                                                     */
/*  Every page previously hand-rolled `overflow-y-auto scroll-thin`    */
/*  with an arbitrary maxHeight. This gives one consistent container   */
/*  with a single maxHeight token so scrolling behaves the same        */
/*  everywhere. Inside ScaledPage the maxHeight must be explicit       */
/*  (flex-1 min-h-0 alone isn't bounded because the scaled content     */
/*  height is unscaled).                                               */
/* ------------------------------------------------------------------ */

export function ScrollArea({
  children,
  className,
  maxHeight = 'min(70vh, 620px)',
}: {
  children: ReactNode
  className?: string
  maxHeight?: string
}) {
  return (
    <div
      className={cn('overflow-y-auto overflow-x-hidden scroll-thin', className)}
      style={{ maxHeight }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  <EmptyStateWrapper> — empty-branch + list                          */
/*                                                                     */
/*  Replaces the `{list.length === 0 ? <EmptyState/> : <list/>}`       */
/*  branch repeated on every list page. Pass isEmpty, emptyProps, and  */
/*  children (the list).                                               */
/* ------------------------------------------------------------------ */

export function EmptyStateWrapper({
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyHint,
  emptyCta,
  children,
}: {
  isEmpty: boolean
  emptyIcon: ReactNode
  emptyTitle: string
  emptyHint?: string
  emptyCta?: ReactNode
  children: ReactNode
}) {
  if (isEmpty) {
    return (
      <GlassCard className="p-8 min-h-[200px] flex items-center justify-center">
        <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} cta={emptyCta} />
      </GlassCard>
    )
  }
  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  <Field> — labeled form input wrapper                               */
/*                                                                     */
/*  Defined identically in settings.tsx and onboarding.tsx.            */
/*  Consolidated here so both consume the same component.              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  icon,
  required,
  hint,
  children,
  className,
}: {
  label: string
  icon?: ReactNode
  required?: boolean
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block rounded-xl border border-border bg-white/5 px-3 py-2 focus-within:border-primary/60 focus-within:bg-white/[0.07] transition-colors', className)}>
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon}
        {label}
        {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] text-muted-foreground/70 mt-1 block">{hint}</span>
      )}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  <FilterBar> — search + pills + segmented                           */
/*                                                                     */
/*  Replaces the search+pill+segmented pattern duplicated across       */
/*  Library, Tests, Doubts, Notes, Leaderboard (5 pages).              */
/*  Each piece is optional — pass only what the page needs.            */
/* ------------------------------------------------------------------ */

export interface FilterPill {
  key: string
  label: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchLabel = 'Search',
  pills,
  activePill,
  onPillChange,
  pillLabel,
  segmentedOptions,
  segmentedValue,
  onSegmentedChange,
  className,
}: {
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  pills?: FilterPill[]
  activePill?: string
  onPillChange?: (k: string) => void
  pillLabel?: string
  segmentedOptions?: { value: string; label: string }[]
  segmentedValue?: string
  onSegmentedChange?: (v: string) => void
  className?: string
}) {
  const hasSearch = searchValue !== undefined && onSearchChange
  const hasSegmented = segmentedOptions && segmentedValue !== undefined && onSegmentedChange
  const hasPills = pills && onPillChange && activePill !== undefined

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search + segmented row */}
      {(hasSearch || hasSegmented) && (
        <div className="flex items-center gap-3 flex-wrap">
          {hasSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange!(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchLabel}
                className="w-full rounded-full bg-white/5 border border-border pl-9 pr-9 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/[0.07] placeholder:text-muted-foreground transition-colors"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange!('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}
          {hasSegmented && (
            <Segmented
              options={segmentedOptions!}
              value={segmentedValue!}
              onChange={onSegmentedChange!}
            />
          )}
        </div>
      )}
      {/* Pills row */}
      {hasPills && (
        <div className="flex items-center gap-2 overflow-x-auto scroll-none pb-1">
          {pillLabel && (
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
              {pillLabel}
            </span>
          )}
          {pills!.map((p) => (
            <Pill
              key={p.key}
              active={activePill === p.key}
              onClick={() => onPillChange!(p.key)}
            >
              {p.label}
            </Pill>
          ))}
        </div>
      )}
    </div>
  )
}
