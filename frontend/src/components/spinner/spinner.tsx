import { useId } from 'react';
import { cx } from '@/utils/cx';
import './spinner.css';

export interface SpinnerProps extends React.ComponentPropsWithoutRef<'span'> {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label; defaults to "Loading". */
  label?: string;
}

/** Spinner — loading indicator. Use when progress is indeterminate. */
export function Spinner({ size = 'md', label = 'Loading', className, ...rest }: SpinnerProps) {
  const titleId = useId();
  return (
    <span
      className={cx('spinner', `spinner--${size}`, className)}
      role="status"
      aria-labelledby={titleId}
      {...rest}
    >
      <span className="sr-only" id={titleId}>
        {label}
      </span>
    </span>
  );
}