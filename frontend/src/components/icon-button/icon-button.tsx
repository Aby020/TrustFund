import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './icon-button.css';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  /** Visually "on" state (e.g. toggled menu). */
  active?: boolean;
  /** Accessible name. MUST be provided — there is no visible text. */
  'aria-label': string;
  children: ReactNode;
}

/**
 * IconButton — icon-only control. The `aria-label` prop is a required part of
 * the public type so it can never be forgotten.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = 'md', active = false, className, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'icon-button',
          `icon-button--${size}`,
          active && 'icon-button--active',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);