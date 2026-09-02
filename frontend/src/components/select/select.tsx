import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import './select.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Presence of an error turns the border red and sets aria-invalid. */
  invalid?: boolean;
  /** Default placeholder option label rendered when `value` is empty. */
  placeholder?: string;
}

/** Select — native dropdown styled to the design system (no custom menu). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid = false, placeholder, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx('select', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {placeholder !== undefined && (
        <option value="" disabled selected={!rest.value}>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});