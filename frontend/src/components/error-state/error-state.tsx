import type { ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './error-state.css';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: ReactNode;
  /** Retry / secondary actions. */
  actions?: ReactNode;
}

/** ErrorState — graceful error surface with a default retry affordance. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  actions,
  className,
  ...rest
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cx('error-state', className)}
      {...rest}
    >
      <div className="error-state__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 8v5M12 16.5v.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="error-state__title">{title}</p>
      {description && <p className="error-state__description">{description}</p>}
      {actions && <div className="error-state__actions">{actions}</div>}
    </div>
  );
}