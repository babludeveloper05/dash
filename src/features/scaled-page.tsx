'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * ScaledPage
 *
 * Wraps a page's content in a fixed design-width (1440px) container that
 * scales uniformly to fit the viewport WIDTH. Container queries (`@lg:` etc.)
 * inside the content fire based on the 1440px design width — not the viewport
 * — so the desktop layout is preserved at every screen size and simply
 * scales down proportionally on narrower viewports.
 *
 * Vertical overflow scrolls naturally: the wrapper's height is set to the
 * scaled content height so the scrollbar matches the visual content (no dead
 * space, no clipped content).
 *
 * The Home dashboard is NOT wrapped in this — it uses its own `useCanvasFit`
 * hook that scales to fit BOTH width and height (since the canvas has a
 * bounded height). ScaledPage only scales to fit width; tall content scrolls.
 */
export function ScaledPage({
  children,
  designWidth = 1440,
  className,
}: {
  children: ReactNode
  designWidth?: number
  className?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [contentH, setContentH] = useState(0)

  // Scale from viewport width — content shrinks proportionally on narrow
  // screens. No floor: let it scale as low as needed so nothing overflows.
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setScale(Math.min(1, w / designWidth))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [designWidth])

  // Measure the content's natural height at the design width (unaffected by
  // the transform). Re-measures on content changes via ResizeObserver.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => setContentH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="w-full">
      {/*
        Wrapper: height = scaled content height so the parent scroll container
        (the <main> in app-shell) scrolls the correct range. Width = scaled
        design width, centered. position: relative so the absolutely-positioned
        content anchors to it.

        Note: this component does NOT handle its own scrolling — the parent
        <main> is the single scroll container, which lets app-shell track
        scrollYProgress for the parallax progress bar + background drift.
      */}
      <div
        style={{
          height: contentH * scale,
          width: designWidth * scale,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/*
          Content: rendered at the full design width with @container so
          container-query breakpoints (@lg:, @xl:, etc.) fire based on 1440px.
          transform: scale shrinks it visually; transform-origin: top left so
          it aligns with the wrapper's top-left corner. position: absolute so
          it doesn't affect the wrapper's layout (the wrapper's height is set
          explicitly above).
        */}
        <div
          ref={contentRef}
          className={`@container ${className ?? ''}`}
          style={{
            width: designWidth,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
