import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Button,
  FormField,
  PasswordField,
  PasswordStrength,
  RoleSelect,
  useToast,
} from '@/components';
import { useAuth } from '@/context/auth-context';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import type { ApiError, UserRole } from '@/types/api';
import { AUTH_ROUTES } from '@/app/config';
import './register.css';

/**
 * RegisterPage — full registration form with name, email, password,
 * confirm password, role selection, password strength feedback, and
 * Motion transitions. Uses the existing AuthLayout wrapper.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('DONOR');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!firstName.trim()) {
      next.firstName = 'First name is required';
    } else if (firstName.trim().length > 150) {
      next.firstName = 'First name must be 150 characters or fewer';
    }

    if (!lastName.trim()) {
      next.lastName = 'Last name is required';
    } else if (lastName.trim().length > 150) {
      next.lastName = 'Last name must be 150 characters or fewer';
    }

    if (!email.trim()) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Enter a valid email address';
    }

    if (!password) {
      next.password = 'Password is required';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      toast.success('Account created!', 'Welcome to TrustFund.');
      navigate('/', { replace: true });
    } catch (error) {
      const apiError = error as ApiError;

      // Map known error states to user-friendly messages.
      if (apiError.status === 400) {
        // Field-level validation errors from Django.
        const fieldMap: Record<string, string> = {};
        if (apiError.fieldErrors) {
          for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
            // Django returns snake_case field names; map to camelCase.
            const camelKey = key === 'first_name' ? 'firstName'
              : key === 'last_name' ? 'lastName'
              : key;
            fieldMap[camelKey] = messages[0];
          }
        }
        if (Object.keys(fieldMap).length > 0) {
          setErrors(fieldMap);
        } else {
          setErrors({ form: apiError.message });
        }
      } else if (apiError.status === 0) {
        setErrors({ form: 'Unable to connect. Please check your internet and try again.' });
      } else if (apiError.status >= 500) {
        setErrors({ form: 'Something went wrong on our end. Please try again later.' });
      } else {
        setErrors({ form: apiError.message || 'An unexpected error occurred.' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="register-page"
    >
      <motion.h1 variants={fadeUp} className="auth-layout__title">
        Create your account
      </motion.h1>
      <motion.p variants={fadeUp} className="auth-layout__subtitle">
        Join a community of trusted giving and transparent impact.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate aria-label="Create an account">
        {errors.form && (
          <motion.div
            variants={fadeUp}
            className="register-page__form-error"
            role="alert"
            aria-live="assertive"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {errors.form}
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="register-page__fields">
          <div className="register-page__name-row">
            <FormField label="First name" htmlFor="reg-first-name" error={errors.firstName} required>
              {({ id, invalid }) => (
                <input
                  id={id}
                  type="text"
                  className="input"
                  placeholder="Jane"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errors.firstName ? `${id}-error` : undefined}
                  disabled={loading}
                />
              )}
            </FormField>

            <FormField label="Last name" htmlFor="reg-last-name" error={errors.lastName} required>
              {({ id, invalid }) => (
                <input
                  id={id}
                  type="text"
                  className="input"
                  placeholder="Doe"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errors.lastName ? `${id}-error` : undefined}
                  disabled={loading}
                />
              )}
            </FormField>
          </div>

          <FormField label="Email" htmlFor="reg-email" error={errors.email} required>
            {({ id, invalid }) => (
              <input
                id={id}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={invalid || undefined}
                aria-describedby={errors.email ? `${id}-error` : undefined}
                disabled={loading}
              />
            )}
          </FormField>

          <FormField label="Password" htmlFor="reg-password" error={errors.password} required>
            {({ id, invalid }) => (
              <>
                <PasswordField
                  id={id}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={invalid}
                  aria-describedby={[
                    errors.password ? `${id}-error` : '',
                    `${id}-strength`,
                  ].filter(Boolean).join(' ') || undefined}
                  disabled={loading}
                />
                <div id={`${id}-strength`} className="register-page__strength">
                  <PasswordStrength password={password} />
                </div>
              </>
            )}
          </FormField>

          <FormField
            label="Confirm password"
            htmlFor="reg-confirm-password"
            error={errors.confirmPassword}
            required
          >
            {({ id, invalid }) => (
              <PasswordField
                id={id}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={invalid}
                aria-describedby={errors.confirmPassword ? `${id}-error` : undefined}
                disabled={loading}
              />
            )}
          </FormField>

          <RoleSelect
            value={role}
            onChange={setRole}
            disabled={loading}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="register-page__actions">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Create account
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="register-page__footer">
          Already have an account?{' '}
          <Link to={AUTH_ROUTES.login} className="register-page__link">
            Sign in
          </Link>
        </motion.p>
      </form>
    </motion.div>
  );
}
