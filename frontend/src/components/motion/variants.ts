/**
 * Motion variants and utilities for the TrustFund premium landing page.
 *
 * All animation targets use transform/opacity only — no layout properties.
 * Reduced-motion is handled at the MotionConfig level (home.tsx wraps
 * everything in <MotionConfig reducedMotion="user">), so variants do not
 * need per-element reduced-motion logic.
 *
 * Import from 'motion/react' for the Variants type.
 */

import type { Variants, TargetAndTransition } from 'motion/react';

/* ------------------------------------------------------------------ */
/*  Shared easing & durations                                         */
/* ------------------------------------------------------------------ */

/** Premium cubic-bezier — slightly overshoots, then settles. */
export const EASE = [0.22, 1, 0.36, 1] as const;

const DUR = {
  fast: 0.35,
  base: 0.5,
  slow: 0.7,
} as const;

/* ------------------------------------------------------------------ */
/*  Entrance variants                                                 */
/* ------------------------------------------------------------------ */

/** Slide-up + fade — the primary reveal pattern. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE },
  },
};

/** Pure opacity reveal — for background / decorative layers. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DUR.slow, ease: 'easeOut' },
  },
};

/** Scale-up + fade — for icons, nodes, cards. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE },
  },
};

/* ------------------------------------------------------------------ */
/*  Stagger container                                                 */
/* ------------------------------------------------------------------ */

/** Place on a parent motion.* element; children use fadeUp/scaleIn. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.06,
    },
  },
};

/** Faster stagger for tighter groups (receipt details, alloc bars). */
export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Progress / allocation fill                                        */
/* ------------------------------------------------------------------ */

/**
 * scaleX 0→1 — use with transformOrigin: 'left' inline.
 * Animates transform only, never width.
 */
export const progressFill: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

/** Staggered allocation segments — each segment scaleX with a small stagger. */
export const allocSegment: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

/* ------------------------------------------------------------------ */
/*  Continuous float / ambient                                        */
/* ------------------------------------------------------------------ */

export interface FloatOptions {
  /** Vertical amplitude in px (default 6). */
  amplitude?: number;
  /** Cycle duration in seconds (default 6). */
  duration?: number;
  /** Delay before first cycle (default 0). */
  delay?: number;
  /** Extra rotation in degrees (default 0 — no rotation). */
  rotate?: number;
}

/**
 * Returns a `visible` variant state with an infinite mirror loop.
 * Place on a motion.* element alongside a reveal variant:
 *
 *   variants={{ ...fadeUp, visible: { ...fadeUp.visible, ...float() } }}
 *
 * Or use `floatVariant()` for a standalone continuous float.
 */
export function float({
  amplitude = 6,
  duration = 6,
  delay = 0,
  rotate = 0,
}: FloatOptions = {}): TargetAndTransition {
  return {
    y: [0, -amplitude, 0],
    ...(rotate ? { rotate: [0, rotate, 0] } : {}),
    transition: {
      y: {
        duration,
        repeat: Infinity,
        repeatType: 'mirror' as const,
        ease: 'easeInOut',
        delay,
      },
      ...(rotate
        ? {
            rotate: {
              duration: duration * 1.1,
              repeat: Infinity,
              repeatType: 'mirror' as const,
              ease: 'easeInOut',
              delay: delay + 0.3,
            },
          }
        : {}),
    },
  };
}

/**
 * Ambient background motion — very slow opacity + subtle scale.
 * Intended for decorative background layers, not content.
 */
export const ambientPulse: Variants = {
  hidden: { opacity: 0, scale: 1 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: 'easeOut' },
  },
};

export function ambientLoop({
  scaleRange = [1, 1.04],
  opacityRange = [0.85, 1],
  duration = 14,
}: {
  scaleRange?: [number, number];
  opacityRange?: [number, number];
  duration?: number;
} = {}): TargetAndTransition {
  return {
    scale: scaleRange,
    opacity: opacityRange,
    transition: {
      scale: {
        duration,
        repeat: Infinity,
        repeatType: 'mirror' as const,
        ease: 'easeInOut',
      },
      opacity: {
        duration: duration * 0.8,
        repeat: Infinity,
        repeatType: 'mirror' as const,
        ease: 'easeInOut',
      },
    },
  };
}
