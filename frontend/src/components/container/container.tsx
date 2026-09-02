import type { HTMLAttributes, ElementType, ReactNode } from 'react';
import { cx } from '@/utils/cx';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element (e.g. 'header', 'footer'). */
  as?: ElementType;
  /** Constrain below the page width when needed. */
  width?: 'page' | 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

/**
 * Container — horizontal page gutter + max-width. Semantic by default, use
 * `as` for region-level containers.
 */
export function Container({ as = 'div', width = 'page', className, children, ...rest }: ContainerProps) {
  const Tag = as as ElementType;
  const style = width === 'page'
    ? undefined
    : { maxWidth: `var(--container-${width})` };

  return (
    <Tag
      className={cx('container', className)}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}