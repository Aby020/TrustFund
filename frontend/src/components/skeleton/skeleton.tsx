import type { HTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import './skeleton.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Shape presets: "text" (single line) or "circle" (avatar). */
  variant?: 'block' | 'text' | 'circle';
  /** Explicit width (any CSS length). Defaults vary by variant. */
  width?: string | number;
  height?: string | number;
}

/** Skeleton — loading placeholder. Prefer over a flash of empty content. */
export function Skeleton({
  variant = 'block',
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      className={cx('skeleton', variant !== 'block' && `skeleton--${variant}`, className)}
      style={{
        ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
        ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}