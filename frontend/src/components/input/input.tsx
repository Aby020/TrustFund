import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import './input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Overrides the default text color; "left" and "right" align overlay icons. */
  sizeVariant?: 'md' | 'lg';
  /** Presence of an error turns the border red and sets aria-invalid. */
  invalid?: boolean;
}

/** Input — single-line text entry. Wire `aria-invalid` via the `invalid` prop. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, sizeVariant = 'md', invalid = false, type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx(
        'input',
        sizeVariant === 'lg' && 'input--lg',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});