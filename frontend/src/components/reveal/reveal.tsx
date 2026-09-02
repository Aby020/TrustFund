import { type ElementType, type CSSProperties, type ReactNode, useRef, useState, useEffect } from 'react';
import { cx } from '@/utils/cx';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import './reveal.css';

export interface RevealProps {
  /** Render as a different element (default 'div'). */
  as?: ElementType;
  /** Delay before the transition starts (ms). Useful for stagger. */
  delay?: number;
  /** Transition duration override (ms). */
  duration?: number;
  /** Content. */
  children: ReactNode;
  /** Additional class names. */
  className?: string;
  /** Additional HTML attributes (data-testid, aria-*, etc.). */
  [key: string]: unknown;
}

/**
 * Reveal — lightweight scroll-triggered entrance wrapper. Uses
 * IntersectionObserver to toggle an `.is-visible` class; CSS handles the
 * actual transition. Respects prefers-reduced-motion (content is immediately
 * visible when reduced motion is active).
 *
 * The CSS layer (reveal.css) defines the visual transition; this component
 * only manages the visibility toggle.
 */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  duration,
  children,
  className,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    /* If the browser does not support IntersectionObserver, reveal
       immediately — content must remain readable without advanced APIs. */
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const style: (CSSProperties & Record<string, string | number | undefined>) | undefined =
    delay > 0 || duration
      ? {
          ...(delay > 0 ? { '--reveal-delay': `${delay}ms` } : {}),
          ...(duration ? { '--reveal-duration': `${duration}ms` } : {}),
        }
      : undefined;

  return (
    <Tag
      ref={ref}
      className={cx('reveal', visible && 'is-visible', className)}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
