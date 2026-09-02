import { useId, type ReactNode } from 'react';
import { cx } from '@/utils/cx';
import './form-field.css';

export interface FormFieldProps {
  label: ReactNode;
  /** Stable or auto-generated id for the associated control. */
  htmlFor?: string;
  /** Help text shown under the control. */
  hint?: ReactNode;
  /** Error text; swaps hint styling and marks control aria-invalid via the
   * `invalid` boolean consumers pass to their control. */
  error?: ReactNode;
  /** Optional marker when the field is required. */
  required?: boolean;
  children: (controlProps: { id: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/**
 * FormField — label + hint/error + control composition for conventional
 * accessible labels. The render prop keeps error wiring explicit:
 *
 *   <FormField label="Email" htmlFor="email" error={error}>
 *     {({ id, invalid }) => <Input id={id} invalid={invalid} />}
 *   </FormField>
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  const autoId = useId();
  const controlId = htmlFor ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const invalid = Boolean(error);

  return (
    <div className={cx('form-field', className)}>
      <label className="form-field__label" htmlFor={controlId}>
        {label}
        {required && (
          <span className="form-field__label-required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({ id: controlId, invalid })}

      {hint && !error && (
        <span className="form-field__hint" id={hintId}>
          {hint}
        </span>
      )}

      {error && (
        <span className="form-field__error" id={errorId} role="alert">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}