import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/layouts/site-header/site-header';
import { SiteFooter } from '@/layouts/site-footer/site-footer';
import './app-shell.css';

/**
 * AppShell — the global application frame. Composes the premium SiteHeader
 * (brand, primary nav, auth actions, responsive mobile menu), a main region
 * for the routed page via <Outlet/>, and the SiteFooter. Page-level vertical
 * rhythm comes from .app-main; future pages drop into routes.tsx without
 * restructuring the shell.
 */
export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
