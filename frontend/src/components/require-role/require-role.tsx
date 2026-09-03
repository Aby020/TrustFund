import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/types/api';

/**
 * RequireRole — role-based access gate. Must be nested inside a ProtectedRoute.
 *
 * If the authenticated user has one of the allowed roles, children render.
 * Otherwise the user is redirected to the dashboard (or home as fallback).
 *
 * Usage in routes.tsx:
 * ```tsx
 * <Route element={<ProtectedRoute />}>
 *   <Route element={<RequireRole roles={['ADMIN', 'CHARITY']} />}>
 *     <Route path="/admin" element={<AdminPage />} />
 *   </Route>
 * </Route>
 * ```
 */
interface RequireRoleProps {
  /** One or more roles that are allowed to access the route. */
  roles: UserRole[];
  /** Where to redirect unauthorized users. Defaults to '/dashboard'. */
  redirectTo?: string;
}

export default function RequireRole({
  roles,
  redirectTo = '/dashboard',
}: RequireRoleProps) {
  const { status, user } = useAuth();

  // Wait for session restoration to settle before checking role.
  if (status === 'restoring') return null;

  // user is guaranteed non-null by the parent ProtectedRoute.
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
