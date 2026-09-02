import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import './textarea.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Presence of an error turns the border red and sets aria-invalid. */
  invalid?: boolean;
}

/** Textarea — multi-line text entry. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx('textarea', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});