import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { DonorDashboardPage } from '@/pages/donor';

/**
 * DashboardPage — authenticated landing, role-aware.
 *
 * Donors (and admins, who can view donor data) see the full donor dashboard.
 * Charity users are routed to their management area. Kept at the existing
 * /dashboard route so navigation behavior is unchanged.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const isDonorView = user?.role === 'DONOR' || user?.role === 'ADMIN';

  if (user?.role === 'CHARITY') {
    return <Navigate to="/charity/manage" replace />;
  }

  if (user?.role === 'VOLUNTEER') {
    return <Navigate to="/volunteer/manage" replace />;
  }

  if (isDonorView) {
    return <DonorDashboardPage />;
  }

  // Any other authenticated roles get a graceful account home.
  return (
    <section className="section">
      <div className="container">
        <h1>Account</h1>
        <p>Welcome, {user?.firstName ?? 'there'}.</p>
        <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
          Signed in as <strong>{user?.email}</strong> · Role: {user?.role}
        </p>
      </div>
    </section>
  );
}
