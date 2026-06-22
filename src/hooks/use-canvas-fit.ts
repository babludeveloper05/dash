'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useCanvasFit
 *
 * Measures a container element with a ResizeObserver and computes a uniform
 * scale factor that fits a fixed-dimension canvas (e.g. the 1448px Home
 * dashboard canvas) inside the container — never exceeding scale 1 (no
 * upscaling) and never overflowing either axis.
 *
 * Returns a ref to attach to the measuring container and the computed scale.
 *
 * @param canvasWidth  The intrinsic width of the canvas (e.g. 1448).
 * @param canvasHeight The intrinsic height of the canvas.
 * @param pad          Horizontal/vertical padding to leave inside the container
 *                     (so the canvas doesn't touch the edges). Default 16.
 */
export function useCanvasFit(
  canvasWidth: number,
  canvasHeight: number,
  pad = 16
): { ref: React.RefObject<HTMLDivElement | null>; scale: number } {
  const ref = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === 0 || h === 0) return
      const s = Math.min(
        1,
        (w - pad) / canvasWidth,
        (h - pad) / canvasHeight
      )
      // Clamp to a sane floor so components don't get invisibly tiny.
      setScale(Math.max(0.3, s))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    // Also recompute on viewport resize (covers the case where the container
    // size doesn't change but the canvas height does — e.g. components added).
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [canvasWidth, canvasHeight, pad])

  return { ref, scale }
}
