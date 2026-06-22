'use client'

import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useVirtual } from '@/hooks/use-virtual'

/* ------------------------------------------------------------------ */
/*  <VirtualList> — drop-in windowed row list                          */
/*                                                                     */
/*  Wraps the useVirtual hook so pages stop hand-wiring the            */
/*  spacer + translateY plumbing. Pass items, itemHeight, and          */
/*  renderItem. Only the visible window (+ overscan) mounts.           */
/*                                                                     */
/*  The container is the scroll element with a bounded maxHeight       */
/*  (required inside ScaledPage where flex-1 isn't bounded).           */
/* ------------------------------------------------------------------ */

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 10,
  maxHeight = 'min(60vh, 520px)',
  className,
  emptyState,
}: {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  maxHeight?: string
  className?: string
  emptyState?: ReactNode
}) {
  const { containerRef, visibleRange, totalHeight, offsetY } = useVirtual(
    items.length,
    itemHeight,
    overscan
  )
  const [start, end] = visibleRange
  const visible = items.slice(start, end + 1)

  if (items.length === 0 && emptyState) {
    return <div className={cn('overflow-y-auto scroll-thin', className)} style={{ maxHeight }}>{emptyState}</div>
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto scroll-thin', className)}
      style={{ maxHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visible.map((item, i) => renderItem(item, start + i))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  <VirtualGrid> — windowed grid by row                               */
/*                                                                     */
/*  Same idea as VirtualList but for CSS grids: virtualizes by row     */
/*  (each row = `cols` items). Pass items, cols, rowHeight,            */
/*  renderItem, and gridClassName (the tailwind grid-cols classes).    */
/* ------------------------------------------------------------------ */

export function VirtualGrid<T>({
  items,
  cols,
  rowHeight,
  renderItem,
  overscan = 4,
  maxHeight = 'min(70vh, 620px)',
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  emptyState,
}: {
  items: T[]
  cols: number
  rowHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  maxHeight?: string
  gridClassName?: string
  emptyState?: ReactNode
}) {
  const rowCount = Math.ceil(items.length / cols)
  const { containerRef, visibleRange, totalHeight, offsetY } = useVirtual(
    rowCount,
    rowHeight,
    overscan
  )
  const [start, end] = visibleRange
  const visible = items.slice(start * cols, (end + 1) * cols)

  if (items.length === 0 && emptyState) {
    return <div className="overflow-y-auto scroll-thin" style={{ maxHeight }}>{emptyState}</div>
  }

  return (
    <div ref={containerRef} className="overflow-y-auto scroll-thin" style={{ maxHeight }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div className={gridClassName} style={{ transform: `translateY(${offsetY}px)` }}>
          {visible.map((item, i) => renderItem(item, start * cols + i))}
        </div>
      </div>
    </div>
  )
}
