import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import { IconButton } from '../icon-button/icon-button';
import './password-field.css';

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Presence of an error turns the border red and sets aria-invalid. */
  invalid?: boolean;
}

/**
 * PasswordField — password input with a show/hide toggle button.
 * Accessible: toggle announces its state via aria-label; the input
 * always has type="password" or "text" based on visibility.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ className, invalid = false, id, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className={cx('password-field', className)}>
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className="input password-field__input"
          aria-invalid={invalid || undefined}
          autoComplete="current-password"
          {...rest}
        />
        <IconButton
          type="button"
          className="password-field__toggle"
          size="sm"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </IconButton>
      </div>
    );
  },
);
