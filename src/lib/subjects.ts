import {
  Atom, FlaskConical, Sigma, Dna, Cpu, BookOpen,
  type LucideIcon,
} from 'lucide-react'
import type { SubjectId } from './types'

/**
 * Global subject appearance system.
 *
 * Single source of truth for subject colors, gradients, glows, and icons.
 * Previously duplicated across 4+ files:
 *   - SUBJECT_TONE (doubts) — solid oklch color per subject
 *   - SUBJECT_POSTER (library, video-player) — Tailwind gradient classes
 *   - SUBJECT_GRADIENT / SUBJECT_GLOW (live) — CSS gradient + glow strings
 *   - SUBJECT_ACCENT (syllabus) — oklch accent color
 *   - SUBJECT_ICON (profile) — lucide icon per subject
 *   - subjectTone / gradientFor / glowFor / accentFor — 4 near-identical helpers
 *
 * Pages now import from here. The tone is a hue-based oklch color; the
 * gradient/glow are derived from it so everything stays in sync.
 */

interface SubjectStyle {
  /** Solid accent color as oklch. */
  tone: string
  /** Tailwind gradient classes for a poster/thumbnail background. */
  posterClass: string
  /** CSS background gradient string (for inline styles). */
  gradient: string
  /** CSS radial glow string (for inline styles). */
  glow: string
  /** Lucide icon. */
  icon: LucideIcon
}

const SUBJECT_STYLES: Record<SubjectId, SubjectStyle> = {
  physics: {
    tone: 'oklch(0.78 0.14 62)',
    posterClass: 'from-[oklch(0.34_0.075_62)] via-[oklch(0.22_0.05_62)] to-[oklch(0.12_0.015_62)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.075 62), oklch(0.22 0.05 62), oklch(0.12 0.015 62))',
    glow: 'radial-gradient(circle, oklch(0.78 0.14 62 / 0.25), transparent 70%)',
    icon: Atom,
  },
  chemistry: {
    tone: 'oklch(0.72 0.12 150)',
    posterClass: 'from-[oklch(0.34_0.075_150)] via-[oklch(0.22_0.05_150)] to-[oklch(0.12_0.015_150)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.075 150), oklch(0.22 0.05 150), oklch(0.12 0.015 150))',
    glow: 'radial-gradient(circle, oklch(0.72 0.12 150 / 0.25), transparent 70%)',
    icon: FlaskConical,
  },
  maths: {
    tone: 'oklch(0.74 0.14 25)',
    posterClass: 'from-[oklch(0.34_0.075_25)] via-[oklch(0.22_0.05_25)] to-[oklch(0.12_0.015_25)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.075 25), oklch(0.22 0.05 25), oklch(0.12 0.015 25))',
    glow: 'radial-gradient(circle, oklch(0.74 0.14 25 / 0.25), transparent 70%)',
    icon: Sigma,
  },
  biology: {
    tone: 'oklch(0.7 0.13 30)',
    posterClass: 'from-[oklch(0.34_0.075_30)] via-[oklch(0.22_0.05_30)] to-[oklch(0.12_0.015_30)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.075 30), oklch(0.22 0.05 30), oklch(0.12 0.015 30))',
    glow: 'radial-gradient(circle, oklch(0.7 0.13 30 / 0.25), transparent 70%)',
    icon: Dna,
  },
  cs: {
    tone: 'oklch(0.75 0.09 200)',
    posterClass: 'from-[oklch(0.34_0.06_200)] via-[oklch(0.22_0.04_200)] to-[oklch(0.12_0.015_200)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.06 200), oklch(0.22 0.04 200), oklch(0.12 0.015 200))',
    glow: 'radial-gradient(circle, oklch(0.75 0.09 200 / 0.25), transparent 70%)',
    icon: Cpu,
  },
  english: {
    tone: 'oklch(0.78 0.05 90)',
    posterClass: 'from-[oklch(0.34_0.055_90)] via-[oklch(0.22_0.04_90)] to-[oklch(0.12_0.015_90)]',
    gradient: 'linear-gradient(135deg, oklch(0.34 0.055 90), oklch(0.22 0.04 90), oklch(0.12 0.015 90))',
    glow: 'radial-gradient(circle, oklch(0.78 0.05 90 / 0.25), transparent 70%)',
    icon: BookOpen,
  },
}

/** Fallback for subjects not in the canonical 6 (custom user subjects). */
const FALLBACK: SubjectStyle = {
  tone: 'oklch(0.74 0.13 62)',
  posterClass: 'from-[oklch(0.34_0.06_62)] via-[oklch(0.22_0.04_62)] to-[oklch(0.12_0.015_62)]',
  gradient: 'linear-gradient(135deg, oklch(0.34 0.06 62), oklch(0.22 0.04 62), oklch(0.12 0.015 62))',
  glow: 'radial-gradient(circle, oklch(0.74 0.13 62 / 0.25), transparent 70%)',
  icon: BookOpen,
}

/**
 * Get the full style record for a subject. Accepts either a SubjectId or any
 * string (for custom user-defined subjects — returns the fallback).
 */
function subjectStyle(id: string): SubjectStyle {
  return (SUBJECT_STYLES as Record<string, SubjectStyle>)[id] ?? FALLBACK
}

/** Solid accent color (oklch) for a subject. */
export function subjectTone(id: string): string {
  return subjectStyle(id).tone
}

/** Tailwind gradient classes for a subject poster/thumbnail. */
export function subjectPoster(id: string): string {
  return subjectStyle(id).posterClass
}

/** CSS gradient string for a subject (inline style). */
export function subjectGradient(id: string): string {
  return subjectStyle(id).gradient
}

/** CSS radial glow string for a subject (inline style). */

/** Lucide icon for a subject. */
export function subjectIcon(id: string): LucideIcon {
  return subjectStyle(id).icon
}
