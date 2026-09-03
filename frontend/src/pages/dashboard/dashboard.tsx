import { useAuth } from '@/context/auth-context';

/**
 * DashboardPage — authenticated landing. Minimal placeholder that confirms
 * auth state is working; real dashboard content arrives in a later batch.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <section className="section">
      <div className="container">
        <h1>Dashboard</h1>
        <p>Welcome, {user?.firstName ?? 'there'}.</p>
        <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
          Signed in as <strong>{user?.email}</strong> · Role: {user?.role}
        </p>
        <button
          type="button"
          className="btn btn--outline"
          style={{ marginTop: 'var(--space-6)' }}
          onClick={() => logout()}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
