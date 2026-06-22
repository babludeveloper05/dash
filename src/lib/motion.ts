import type { Transition, Variants } from 'framer-motion'

/**
 * Motion token system for Project Delta.
 *
 * Single source of truth for spring presets, stagger timing, and reduced-motion
 * fallbacks. Every animated surface — page transitions, the nav pill, section
 * cascades — pulls from these constants so motion stays consistent and tunable
 * from one place.
 *
 * Design principles (per the cinematic-nav brief):
 *  - Springs (not duration-based easing) for primary motion — natural settle.
 *  - Direction-aware page variants (slide follows nav direction).
 *  - `prefers-reduced-motion` degrades everything to a near-instant crossfade
 *    with no directional slide and no stagger.
 */

// --- Spring presets ---------------------------------------------------------

/** Primary spring — page transitions. Deliberate, with a gentle settle. */
export const pageSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 32,
  mass: 1,
}

/** Secondary spring — micro-interactions (nav pill glide). Snappier than pages. */
export const navSpring: Transition = {
  type: 'spring',
  stiffness: 700,
  damping: 40,
  mass: 0.7,
}

/** Section/item entrance spring — same family as the page spring, slightly lighter. */
export const itemSpring: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 0.9,
}

// --- Stagger timing ---------------------------------------------------------

/** Offset between cascading sections (70ms — inside the 40–80ms target band). */
export const STAGGER_INTERVAL = 0.07

/** Small initial delay so the page-slide leads and sections follow it in. */
export const STAGGER_DELAY_CHILDREN = 0.05

// --- Reduced-motion fallback ------------------------------------------------

/** Near-instant crossfade used when `prefers-reduced-motion: reduce` is set. */
export const reducedTransition: Transition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1],
}

// --- Page transition (direction-aware, true 3D) -----------------------------

/**
 * 3D axis model for page transitions:
 *   X axis = front/back (depth)        → translateZ  (the camera move)
 *   Y axis = sideways (left/right)     → translateX  (directional parallax)
 *   Z axis = top/bottom (up/down)      → translateY  (vertical drift)
 *
 * The "camera moves back" effect: the exiting page recedes along −X (negative
 * translateZ = into the screen, away from the viewer) while the entering page
 * comes forward from −X toward 0. With `perspective` on the container, the
 * receding page shrinks and the approaching page grows — real 3D depth, not a
 * 2D scale approximation. The new page thus "appears via parallax" from a
 * deeper layer.
 */

/** Depth distance along X (into the screen). The camera-move magnitude. */
const PAGE_DEPTH = 700
/** Sideways parallax distance (Y axis). */
const PAGE_DISTANCE = 48
/** Vertical drift distance (Z axis). */
const PAGE_RISE = 16

/**
 * Context passed via AnimatePresence `custom` (and mirrored on the motion.main
 * itself) so both entering and exiting pages resolve their variants against the
 * same direction + reduced-motion state.
 */
export interface PageTransitionCtx {
  /** 1 = forward (moving right in the nav), -1 = backward (moving left). */
  dir: number
  /** True when the user prefers reduced motion. */
  reduce: boolean
}

/**
 * Page-level variants — true 3D parallax transition.
 *
 *  ENTER: starts at z: −PAGE_DEPTH (deep in the background, small via
 *         perspective), opacity 0, with a small sideways + vertical offset.
 *         Animates to z: 0 (forward to the viewer), full opacity, centered.
 *
 *  EXIT:  recedes to z: −PAGE_DEPTH (camera moves back, page shrinks into the
 *         distance), opacity 0, drifting sideways + down as it falls away.
 *
 * The sideways (Y) direction follows nav direction so forward/back feel
 * distinct. Under reduced motion, collapses to opacity-only.
 */
export const pageVariants = {
  initial: ({ dir, reduce }: PageTransitionCtx) =>
    reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: -PAGE_DEPTH,                                              // X: deep in background
          x: dir > 0 ? PAGE_DISTANCE : -PAGE_DISTANCE,                // Y: from the side
          y: -PAGE_RISE,                                               // Z: slightly above
        },
  animate: ({ reduce }: PageTransitionCtx) =>
    reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, z: 0 },
  exit: ({ dir, reduce }: PageTransitionCtx) =>
    reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: -PAGE_DEPTH,                                              // X: recedes into distance
          x: dir > 0 ? -PAGE_DISTANCE : PAGE_DISTANCE,                // Y: drifts opposite side
          y: PAGE_RISE,                                                // Z: sinks down
        },
} as Variants

/**
 * Parallax background variants — a depth layer BEHIND the page.
 *
 * Sits at z: −PAGE_DEPTH * 0.5 (halfway between the viewer and the receded
 * page position) so it moves at a different apparent rate than the foreground
 * page — the multi-layer differential that creates the parallax illusion in
 * 3D space. Drifts sideways at ~0.4x the page's Y-axis distance.
 *
 * Under reduced motion, collapses to opacity-only.
 */
export const parallaxBgVariants = {
  initial: ({ dir, reduce }: PageTransitionCtx) =>
    reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: -PAGE_DEPTH * 0.5,
          x: dir > 0 ? PAGE_DISTANCE * 0.4 : -PAGE_DISTANCE * 0.4,
        },
  animate: ({ reduce }: PageTransitionCtx) =>
    reduce ? { opacity: 1 } : { opacity: 1, x: 0, z: -PAGE_DEPTH * 0.5 },
  exit: ({ dir, reduce }: PageTransitionCtx) =>
    reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: -PAGE_DEPTH * 0.5,
          x: dir > 0 ? -PAGE_DISTANCE * 0.4 : PAGE_DISTANCE * 0.4,
        },
} as Variants

/** Resolve the transition for a page based on the reduced-motion flag. */
export function pageTransition(reduce: boolean): Transition {
  return reduce ? reducedTransition : pageSpring
}

// --- Section stagger helpers (Phase 4) --------------------------------------

/**
 * Container variant — orchestrates staggered children.
 *
 * Under reduced motion the container is a no-op (no stagger), so children fall
 * back to their own crossfade without any directional or temporal offset.
 */
export function staggerContainer(reduce: boolean): Variants {
  if (reduce) return { initial: {}, animate: {} }
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: STAGGER_INTERVAL,
        delayChildren: STAGGER_DELAY_CHILDREN,
      },
    },
  }
}

/**
 * Item variant — fades in and lifts up slightly. Applied to each top-level
 * section of a page so the cascade reads as a choreographed reveal rather than
 * a single block appearing at once.
 */
export function staggerItem(reduce: boolean): Variants {
  if (reduce) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 } }
  }
  return { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
}

/** Resolve the transition for a stagger item based on the reduced-motion flag. */
export function itemTransition(reduce: boolean): Transition {
  return reduce ? reducedTransition : itemSpring
}
