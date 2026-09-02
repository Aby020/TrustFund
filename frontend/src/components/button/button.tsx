import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/utils/cx';
import { Spinner } from '../spinner/spinner';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Swaps the label for an inline spinner (same width preserved). */
  loading?: boolean;
  /** Stretch to the full width of its parent. */
  fullWidth?: boolean;
  /** Optional leading/trailing icon nodes. */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

/**
 * Button — the single action control. Renders a native <button> (or an <a>
 * when `href` is given) with design-system variants, sizes and loading state.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = cx(
    'button',
    `button--${variant}`,
    `button--${size}`,
    loading && 'button--loading',
    fullWidth && 'button--full',
    className,
  );

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="button__spinner" size="sm" />}
      <span className="button__label">
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  );
});