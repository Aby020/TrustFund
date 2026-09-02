import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './badge.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Render a leading status dot (use for "live" states). */
  dot?: boolean;
  children: ReactNode;
}

/** Badge — small status/chip label. Semantic tones map to backend statuses. */
export function Badge({ tone = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)} {...rest}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}