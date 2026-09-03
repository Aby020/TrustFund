import { render, screen } from '@testing-library/react';
import { evaluateStrength, PasswordStrength } from './password-strength';

/* -------------------------------------------------------------------------- */
/*  evaluateStrength — pure function unit tests                               */
/* -------------------------------------------------------------------------- */

describe('evaluateStrength', () => {
  it('returns 0 for empty string', () => {
    expect(evaluateStrength('')).toBe(0);
  });

  it('returns 1 for a password with length >= 8 but no mixed case', () => {
    // length >= 8 ✓, mixed case ✗, digit ✗, special ✗
    expect(evaluateStrength('abcdefgh')).toBe(1);
  });

  it('returns 0 for a short lowercase-only password', () => {
    // length < 8, no mixed case, no digit, no special
    expect(evaluateStrength('abcdef')).toBe(0);
  });

  it('returns 2 when length >= 8 and mixed case', () => {
    expect(evaluateStrength('Abcdefgh')).toBe(2);
  });

  it('returns 3 when length >= 8, mixed case, and digit', () => {
    expect(evaluateStrength('Abcdef1h')).toBe(3);
  });

  it('returns 4 for a strong password (all criteria)', () => {
    expect(evaluateStrength('Abcdef1!')).toBe(4);
  });
});

/* -------------------------------------------------------------------------- */
/*  PasswordStrength — component tests                                        */
/* -------------------------------------------------------------------------- */

describe('PasswordStrength', () => {
  it('renders nothing visible when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.querySelector('.password-strength__label')).not.toBeInTheDocument();
  });

  it('shows "Weak" label for a weak password (score 1)', () => {
    // length >= 8, but all lowercase → score 1
    render(<PasswordStrength password="abcdefgh" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Very strong" label for a strong password', () => {
    render(<PasswordStrength password="Abcdef1!" />);
    expect(screen.getByText('Very strong')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite" for screen readers', () => {
    render(<PasswordStrength password="test" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('fills the correct number of segments', () => {
    const { container } = render(<PasswordStrength password="Abcdef1!" />);
    const filled = container.querySelectorAll('.password-strength__segment--filled');
    expect(filled.length).toBe(4);
  });
});
