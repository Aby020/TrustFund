import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components';
import { AuthLayout } from '@/layouts/auth-layout/auth-layout';
import { ProtectedRoute, RequireRole } from '@/components';

/**
 * Central route table. Pages are code-split by default — add pages here,
 * never restructure the shell.
 */

type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;

function lazyPage(loader: PageLoader): LazyExoticComponent<ComponentType> {
  return lazy(loader);
}

/* ---- Public pages ---- */
const HomePage = lazyPage(() => import('@/pages/home/home'));
const NotFoundPage = lazyPage(() => import('@/pages/not-found/not-found'));

/* ---- Auth pages (inside AuthLayout) ---- */
const LoginPage = lazyPage(() => import('@/pages/auth/login/login'));
const RegisterPage = lazyPage(() => import('@/pages/auth/register/register'));

/* ---- Protected pages ---- */
const DashboardPage = lazyPage(() => import('@/pages/dashboard/dashboard'));

/** Shared fallback shown while a lazily-loaded page mounts. */
export function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* ---- Public routes ---- */}
        <Route path="/" element={<HomePage />} />

        {/* ---- Auth routes (centered card layout) ---- */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* ---- Protected routes (require authentication) ---- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Role-gated routes — example structure for future pages */}
          <Route element={<RequireRole roles={['ADMIN']} />}>
            {/* <Route path="/admin" element={<AdminPage />} /> */}
          </Route>
          <Route element={<RequireRole roles={['CHARITY', 'ADMIN']} />}>
            {/* <Route path="/charity/manage" element={<CharityManagePage />} /> */}
          </Route>
          <Route element={<RequireRole roles={['VOLUNTEER', 'ADMIN']} />}>
            {/* <Route path="/volunteer" element={<VolunteerPage />} /> */}
          </Route>
        </Route>

        {/* ---- Catch-all ---- */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/* Convenience: if/when route guards land (protected vs public), define them
 * here so config stays in one file. */

export function RedirectToHome() {
  return <Navigate to="/" replace />;
}

export default AppRoutes;
