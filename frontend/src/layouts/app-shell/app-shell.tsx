import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Container } from '@/components';
import { APP_NAME, APP_TAGLINE, PUBLIC_NAV } from '@/app/config';
import './app-shell.css';

/**
 * AppShell — the application frame. Header (brand, nav, optional actions),
 * main content via <Outlet/>, and footer. Future pages drop into routes.tsx;
 * the shell layout does not change.
 */
export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-header">
        <Container className="app-header__inner">
          <Link className="app-header__brand" to="/" onClick={() => setMobileMenuOpen(false)}>
            <span className="app-header__brand-mark" aria-hidden="true">
              ❤
            </span>
            {APP_NAME}
          </Link>

          <nav className="app-header__nav" aria-label="Primary">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="app-header__actions">
            {/* Auth actions slot — wired in Task 13B once /auth/login exists.
                Keep the menu toggle here so the shell is responsive now. */}
            <button
              type="button"
              className="app-header__menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span className="sr-only">Toggle menu</span>
              <MenuGlyph />
            </button>
          </div>
        </Container>
      </header>

      {mobileMenuOpen && (
        <div className="app-header__mobile-panel" id="mobile-nav">
          <Container>
            <nav className="mobile-nav" aria-label="Mobile">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="app-header__nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </Container>
        </div>
      )}

      <main id="main-content" className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <Container className="app-footer__inner">
          <div>
            <div className="app-footer__brand">
              <span className="app-header__brand-mark" aria-hidden="true">
                ❤
              </span>
              {APP_NAME}
            </div>
            <p className="app-footer__tagline">{APP_TAGLINE}</p>
          </div>
        </Container>
        <Container className="app-footer__bottom">
          <span>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </span>
          <span>Built for transparency and impact.</span>
        </Container>
      </footer>
    </div>
  );
}

function MenuGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}