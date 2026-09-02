import type { ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './empty-state.css';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: ReactNode;
  /** Optional action(s), e.g. a <Button>. */
  action?: ReactNode;
  /** Optional illustration/icon node. Defaults to a neutral glyph. */
  icon?: ReactNode;
}

/** EmptyState — friendly no-data surface for lists and panels. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cx('empty-state', className)} {...rest}>
      <div className="empty-state__icon" aria-hidden="true">
        {icon ?? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 9h18M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}