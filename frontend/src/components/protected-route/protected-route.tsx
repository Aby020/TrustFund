import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Spinner } from '@/components';
import { AUTH_ROUTES } from '@/app/config';
import './protected-route.css';

/**
 * ProtectedRoute — gates access to authenticated-only routes.
 *
 * - While session status is restoring, shows a centered spinner (no flash).
 * - Anonymous users are redirected to /auth/login?from=<current path> so
 *   login can restore them to where they were.
 * - Authenticated users render children via Outlet.
 */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return (
      <div className="protected-route__loading" aria-label="Loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'anonymous') {
    const from = location.pathname + location.search;
    return (
      <Navigate
        to={`${AUTH_ROUTES.login}?from=${encodeURIComponent(from)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
