import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand, Button, Container, Icon } from '@/components';
import { AUTH_ROUTES, PUBLIC_NAV, type AppNavItem } from '@/app/config';
import { useAuth } from '@/context/auth-context';
import { cx } from '@/utils/cx';
import './site-header.css';

/**
 * SiteHeader — the premium global header.
 *
 * Desktop: brand, primary nav with active-route underline, CTA hierarchy and
 * auth actions (reactive to AuthProvider state). Mobile: a single accessible
 * menu button opens a full-width animated panel (slide + staggered links) with
 * Escape-to-close, focus management, body scroll lock, and close-on-navigate.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Elevate the header (stronger shadow/border) once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus management: first link on open, restore to toggle on close.
  useEffect(() => {
    if (!open) {
      if (panelRef.current?.contains(document.activeElement)) {
        toggleRef.current?.focus();
      }
      return;
    }
    const first = panelRef.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
  }, [open]);

  // Close whenever the route changes (also covers the NavLink onNavigate).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const close = () => setOpen(false);

  return (
    <header
      className={cx('site-header', scrolled && 'is-scrolled')}
      data-open={open || undefined}
    >
      <Container className="site-header__inner">
        <Brand to="/" className="site-header__brand" />

        <nav className="site-header__nav" aria-label="Primary">
          {PUBLIC_NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__auth">
            <AuthActions />
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="site-header__menu-toggle"
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </Container>

      {/* Mobile panel — always mounted so entrance/exit can animate. It is
          hidden (visibility + inert + aria-hidden) when closed, so it leaves
          the tab order and accessibility tree. */}
      <div
        ref={panelRef}
        id="site-mobile-nav"
        className={cx('site-header__mobile-panel', open && 'is-open')}
        inert={open ? undefined : true}
        aria-hidden={open ? undefined : true}
      >
        <Container className="site-header__mobile-inner">
          <nav className="site-mobile-nav" aria-label="Mobile">
            <p className="site-mobile-nav__label">Browse</p>
            {PUBLIC_NAV.map((item, index) => (
              <NavItem
                key={item.to}
                item={item}
                variant="mobile"
                onNavigate={close}
                delay={index}
                stagger={open}
              />
            ))}
          </nav>

          <div className="site-mobile-nav__footer">
            <p className="site-mobile-nav__label">Account</p>
            <MobileAuthActions onNavigate={close} />
          </div>
        </Container>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------------
 * Navigation item — shared by desktop + mobile. NavLink's children-as-function
 * drives the animated active underline.
 * ------------------------------------------------------------------------- */

interface NavItemProps {
  item: AppNavItem;
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
  /** Stagger delay (in steps) for the mobile entrance. */
  delay?: number;
  /** Apply the stagger delay — true only while the mobile panel is open, so
      the exit animation is not delayed. */
  stagger?: boolean;
}

function NavItem({ item, variant = 'desktop', onNavigate, delay = 0, stagger = false }: NavItemProps) {
  const style = variant === 'mobile' && stagger ? { transitionDelay: `${delay * 45}ms` } : undefined;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'site-nav__link',
          `site-nav__link--${variant}`,
          isActive && 'is-active',
        )
      }
      style={style}
    >
      {({ isActive }) => (
        <>
          <span className="site-nav__label">{item.label}</span>
          <span className="site-nav__indicator" aria-hidden="true" data-active={isActive || undefined} />
        </>
      )}
    </NavLink>
  );
}

/* ---------------------------------------------------------------------------
 * Auth actions — react to AuthProvider state. Anonymous visitors see
 * Log in + Donate (the primary CTA); authenticated users see Dashboard +
 * Log out. Wired once Task 13B+ delivers the JWT flow.
 * ------------------------------------------------------------------------- */

function AuthActions() {
  const { status, logout } = useAuth();
  const authenticated = status === 'authenticated';

  if (authenticated) {
    return (
      <>
        <Link to={AUTH_ROUTES.dashboard} className="button button--ghost button--md site-nav-cta">
          Dashboard
        </Link>
        <Button
          variant="outline"
          size="md"
          className="site-nav-cta"
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </>
    );
  }

  return (
    <>
      <Link to={AUTH_ROUTES.login} className="button button--ghost button--md site-nav-cta">
        Log in
      </Link>
      <Link
        to="/campaigns"
        className="button button--primary button--md site-nav-cta"
      >
        Donate
      </Link>
    </>
  );
}

function MobileAuthActions({ onNavigate }: { onNavigate: () => void }) {
  const { status, logout } = useAuth();
  const authenticated = status === 'authenticated';

  if (authenticated) {
    return (
      <div className="site-mobile-nav__account">
        <Link
          to={AUTH_ROUTES.dashboard}
          className="button button--secondary button--md button--full site-nav-cta"
          onClick={onNavigate}
        >
          <Icon name="dashboard" size={18} />
          Dashboard
        </Link>
        <Button
          variant="outline"
          size="md"
          fullWidth
          className="site-nav-cta"
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className="site-mobile-nav__account">
      <Link
        to={AUTH_ROUTES.login}
        className="button button--secondary button--md button--full site-nav-cta"
        onClick={onNavigate}
      >
        Log in
      </Link>
      <Link
        to="/campaigns"
        className="button button--primary button--md button--full site-nav-cta"
        onClick={onNavigate}
      >
        Donate
      </Link>
    </div>
  );
}
