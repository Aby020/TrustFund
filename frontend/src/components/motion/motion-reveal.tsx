/**
 * MotionReveal — reusable viewport-triggered entrance wrapper.
 *
 * Encapsulates the most common pattern: a motion.div that fades/slides in
 * when it enters the viewport, with optional stagger delay. Sections import
 * this for simple single-element reveals; orchestrated groups use
 * staggerContainer + child variants directly.
 *
 * Reduced-motion is handled at the <MotionConfig> level — this component
 * does not need per-element logic.
 */

import { type ReactNode } from 'react';
import { motion, type Variants } from 'motion/react';
import { fadeUp } from './variants';

export interface MotionRevealProps {
  children: ReactNode;
  className?: string;
  /** Variant set to use (default fadeUp). */
  variant?: Variants;
  /** Delay before this element's entrance (seconds). Useful inside stagger groups. */
  delay?: number;
  /** Viewport amount threshold (default 0.2 — 20% visible triggers). */
  amount?: number;
  /** Extra HTML attributes forwarded to the inner motion.div. */
  [key: string]: unknown;
}

export function MotionReveal({
  children,
  className,
  variant = fadeUp,
  delay,
  amount = 0.2,
  ...rest
}: MotionRevealProps) {
  return (
    <motion.div
      className={className}
      variants={variant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount, margin: '0px 0px -60px 0px' }}
      transition={delay !== undefined ? { delay } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
