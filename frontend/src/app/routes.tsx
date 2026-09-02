import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components';

/**
 * Central route table. Pages are code-split by default — add pages here,
 * never restructure the shell. Placeholder routes that are NOT yet features
 * point to dedicated, clearly-labeled placeholders (not fake finished pages).
 */

type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;

function lazyPage(loader: PageLoader): LazyExoticComponent<ComponentType> {
  return lazy(loader);
}

const HomePage = lazyPage(() => import('@/pages/home/home'));
const NotFoundPage = lazyPage(() => import('@/pages/not-found/not-found'));

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
        <Route path="/" element={<HomePage />} />

        {/* Feature pages arrive in Task 13B+; route them here:
            /campaigns, /campaigns/:id, /charities, /auth/login, /dashboard … */}

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