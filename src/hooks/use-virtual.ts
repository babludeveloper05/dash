'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useVirtual
 *
 * Lightweight windowed-rendering hook for long lists. Instead of installing a
 * heavy virtualization library, this tracks the scroll container's scrollTop
 * and only renders items within the visible window + an overscan buffer.
 *
 * Works for both fixed-height rows (leaderboard) and dynamic-height grid items
 * (library video cards — uses an estimated row height + recomputes on resize).
 *
 * @param itemCount    Total number of items in the list.
 * @param itemHeight   Estimated height per item (row) in px.
 * @param overscan     Number of extra items to render above/below the viewport.
 * @returns { containerRef, visibleRange, totalHeight, onScroll }
 *   - containerRef: attach to the scroll container element.
 *   - visibleRange: [startIndex, endIndex] inclusive — render list.slice(start, end+1).
 *   - totalHeight: the full virtual height to set on an inner spacer so the
 *     scrollbar reflects the true content size.
 *   - onScroll: attach to the container's onScroll (or rely on the auto-attached
 *     listener via containerRef).
 */
export function useVirtual(
  itemCount: number,
  itemHeight: number,
  overscan = 8
): {
  containerRef: React.RefObject<HTMLDivElement | null>
  visibleRange: [number, number]
  totalHeight: number
  offsetY: number
} {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      // Use the container's visible (scaled) height via getBoundingClientRect.
      // The container must have a bounded height (maxHeight / flex-1 min-h-0 in
      // a bounded parent) for this to reflect the true viewport.
      setViewportH(el.getBoundingClientRect().height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  const totalHeight = itemCount * itemHeight

  // If the list is small enough to fit without virtualization, render everything.
  if (itemCount === 0 || viewportH === 0 || totalHeight <= viewportH + itemHeight * overscan) {
    return {
      containerRef,
      visibleRange: [0, Math.max(0, itemCount - 1)],
      totalHeight,
      offsetY: 0,
    }
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(viewportH / itemHeight) + overscan * 2
  const endIndex = Math.min(itemCount - 1, startIndex + visibleCount)
  const offsetY = startIndex * itemHeight

  return {
    containerRef,
    visibleRange: [startIndex, endIndex],
    totalHeight,
    offsetY,
  }
}
