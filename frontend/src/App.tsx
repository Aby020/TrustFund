import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import { AppRoutes } from '@/app/routes';
import { AppShell } from '@/layouts/app-shell/app-shell';

/**
 * App — application composition root.
 *
 * Provider order matters: ToastProvider must sit above the pages (home
 * demonstrates toasts), AuthProvider is consumed by the shell and future
 * auth-gated pages. AppShell is a pathless layout route that renders
 * <Outlet/>; AppRoutes (code-split) fills it per path.
 */
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/*" element={<AppRoutes />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}