import { Link, Outlet } from 'react-router-dom';
import { Card, CardContent } from '@/components';
import { APP_NAME } from '@/app/config';
import './auth-layout.css';

/**
 * AuthLayout — centered card shell for login/register flows (Task 13B).
 * Ready now so auth routes compose without restructuring.
 */
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <Link className="auth-layout__brand" to="/">
          <span className="auth-layout__brand-mark" aria-hidden="true">
            ❤
          </span>
          {APP_NAME}
        </Link>
        <Card>
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}