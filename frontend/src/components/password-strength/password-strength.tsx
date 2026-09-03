import { cx } from '@/utils/cx';
import './password-strength.css';

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthProps {
  /** Current password string to evaluate. */
  password: string;
  className?: string;
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Very strong',
};

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  0: '',
  1: 'password-strength--weak',
  2: 'password-strength--fair',
  3: 'password-strength--strong',
  4: 'password-strength--very-strong',
};

/**
 * Evaluate password strength on a 0–4 scale.
 * Rules: length >= 8, mixed case, digit, special char.
 */
export function evaluateStrength(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as StrengthLevel;
}

/**
 * PasswordStrength — visual strength indicator with labelled segments.
 * Announces the strength level to screen readers via aria-live.
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const level = evaluateStrength(password);
  const filled = level > 0;
  const label = STRENGTH_LABELS[level];

  return (
    <div
      className={cx('password-strength', STRENGTH_COLORS[level], className)}
      role="status"
      aria-live="polite"
    >
      <div className="password-strength__track" aria-hidden="true">
        <div className="password-strength__segments">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cx(
                'password-strength__segment',
                filled && i <= level && 'password-strength__segment--filled',
              )}
            />
          ))}
        </div>
      </div>
      {filled && (
        <span className="password-strength__label">{label}</span>
      )}
    </div>
  );
}
