'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

/**
 * ThemeVars
 *
 * Injects CSS custom properties into :root based on the user's appearance
 * preferences (accent hue, density, glass strength). This is what makes the
 * entire app recolor live when the user picks a different accent in
 * onboarding or Settings — every component reads from --primary / --ring /
 * --chart-1 etc., so overriding those vars at :root cascades everywhere.
 *
 * Mounted once in the root layout (inside AppShell).
 */
export function ThemeVars() {
  const appearance = useStore((s) => s.appearance)

  useEffect(() => {
    const root = document.documentElement
    const hue = appearance.accentHue

    // Accent color family — derived from the hue. Same lightness/chroma as the
    // default amber so the tonal balance is preserved across hues.
    root.style.setProperty('--primary', `oklch(0.74 0.135 ${hue})`)
    root.style.setProperty('--primary-foreground', `oklch(0.18 0.01 ${hue})`)
    root.style.setProperty('--ring', `oklch(0.74 0.135 ${hue})`)
    root.style.setProperty('--sidebar-primary', `oklch(0.74 0.135 ${hue})`)
    root.style.setProperty('--sidebar-primary-foreground', `oklch(0.18 0.01 ${hue})`)
    root.style.setProperty('--sidebar-ring', `oklch(0.74 0.135 ${hue})`)

    // Chart colors — spread across the hue wheel for visual distinction, all
    // anchored to the user's accent so charts feel coherent with the theme.
    root.style.setProperty('--chart-1', `oklch(0.74 0.135 ${hue})`)
    root.style.setProperty('--chart-2', `oklch(0.8 0.02 ${(hue + 30) % 360})`)
    root.style.setProperty('--chart-3', `oklch(0.6 0.012 ${(hue + 180) % 360})`)
    root.style.setProperty('--chart-4', `oklch(0.45 0.01 ${(hue + 90) % 360})`)
    root.style.setProperty('--chart-5', `oklch(0.7 0.13 ${(hue + 120) % 360})`)

    // Density — adjust the base radius and a --density-pad token pages can use.
    if (appearance.density === 'compact') {
      root.style.setProperty('--radius', '0.75rem')
      root.style.setProperty('--density-pad', '0.75rem')
    } else {
      root.style.setProperty('--radius', '1rem')
      root.style.setProperty('--density-pad', '1rem')
    }

    // Glass strength — adjust card/popover opacity so the glassmorphism is
    // more or less pronounced. The .glass / .glass-strong utilities read
    // --card, so tuning its lightness shifts the glass intensity.
    if (appearance.glass === 'subtle') {
      root.style.setProperty('--card', `oklch(0.19 0.008 ${hue})`)
      root.style.setProperty('--popover', `oklch(0.195 0.008 ${hue})`)
    } else if (appearance.glass === 'medium') {
      root.style.setProperty('--card', `oklch(0.205 0.008 ${hue})`)
      root.style.setProperty('--popover', `oklch(0.21 0.008 ${hue})`)
    } else {
      // strong (default)
      root.style.setProperty('--card', `oklch(0.215 0.008 ${hue})`)
      root.style.setProperty('--popover', `oklch(0.22 0.008 ${hue})`)
    }
  }, [appearance.accentHue, appearance.density, appearance.glass])

  return null
}
