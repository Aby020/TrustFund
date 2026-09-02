import type { HTMLAttributes, ElementType, ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './section.css';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element (default 'section'). */
  as?: ElementType;
  /** Show overline + heading + description at the top of the section. */
  overline?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** Align section header. */
  align?: 'start' | 'center';
  /** Body content. Optional — a section may be header-only. */
  children?: ReactNode;
}

/**
 * Section — vertical-rhythm block with an optional, consistent header
 * (overline / heading / description). Enforces the token section spacing.
 */
export function Section({
  as = 'section',
  overline,
  heading,
  description,
  align = 'start',
  className,
  children,
  ...rest
}: SectionProps) {
  const Tag = as as ElementType;
  const hasHeader = Boolean(overline || heading || description);

  return (
    <Tag className={cx('section', className)} {...rest}>
      {hasHeader && (
        <div className={`section__header section__header--${align}`}>
          {overline && <p className="overline">{overline}</p>}
          {heading && (
            <h1 className="section__heading">{heading}</h1>
          )}
          {description && <p className="section__description">{description}</p>}
        </div>
      )}
      {children}
    </Tag>
  );
}