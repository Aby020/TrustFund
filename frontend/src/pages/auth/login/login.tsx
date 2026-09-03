import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button, FormField, PasswordField, useToast } from '@/components';
import { useAuth } from '@/context/auth-context';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import type { ApiError } from '@/types/api';
import { AUTH_ROUTES } from '@/app/config';
import './login.css';

/**
 * LoginPage — email/password login with client-side validation, loading state,
 * API error handling, and Motion entrance. Uses the existing AuthLayout wrapper
 * and design-system components exclusively.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // Where to redirect after login — defaults to home.
  const redirectTo = searchParams.get('from') ?? '/';

  function validate(): boolean {
    const next: typeof errors = {};

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

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await login(email.trim(), password);
      toast.success('Welcome back!', 'You are now signed in.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const apiError = error as ApiError;

      // Map known error states to user-friendly messages.
      if (apiError.status === 401) {
        setErrors({ form: 'Invalid email or password. Please try again.' });
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
      className="login-page"
    >
      <motion.h1 variants={fadeUp} className="auth-layout__title">
        Welcome back
      </motion.h1>
      <motion.p variants={fadeUp} className="auth-layout__subtitle">
        Sign in to continue your journey of trusted giving.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate aria-label="Log in">
        {errors.form && (
          <motion.div
            variants={fadeUp}
            className="login-page__form-error"
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

        <motion.div variants={fadeUp} className="login-page__fields">
          <FormField label="Email" htmlFor="login-email" error={errors.email} required>
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

          <FormField label="Password" htmlFor="login-password" error={errors.password} required>
            {({ id, invalid }) => (
              <PasswordField
                id={id}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={invalid}
                aria-describedby={errors.password ? `${id}-error` : undefined}
                disabled={loading}
              />
            )}
          </FormField>
        </motion.div>

        <motion.div variants={fadeUp} className="login-page__actions">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Sign in
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="login-page__footer">
          Don&apos;t have an account?{' '}
          <Link to={AUTH_ROUTES.register} className="login-page__link">
            Create one
          </Link>
        </motion.p>
      </form>
    </motion.div>
  );
}
