/**
 * app/config — app-level constants. Track brand + environment bits here so
 * pages never hard-code names or endpoints.
 */

export const APP_NAME = 'TrustFund';
export const APP_TAGLINE = 'Trusted giving, real impact.';

/** Copy for the header wordmark — subline shown beside the name. */
export const APP_WORDMARK = 'TrustFund';

/** Nav model consumed by the shell (routes land in Task 13B+). */
export interface AppNavItem {
  label: string;
  to: string;
  match: string[];
}

/**
 * Primary (header) navigation. These are the top-level destinations a visitor
 * reaches first. `match` lets the shell keep a parent item active while its
 * nested routes (/campaigns/:id) render.
 */
export const PUBLIC_NAV: AppNavItem[] = [
  { label: 'Campaigns', to: '/campaigns', match: ['/campaigns'] },
  { label: 'Charities', to: '/charities', match: ['/charities'] },
  { label: 'How it works', to: '/how-it-works', match: ['/how-it-works'] },
];

/**
 * Authentication + account destinations. Pages land in later tasks; the shell
 * references these slots so auth-aware navigation reacts once wiring exists.
 */
export const AUTH_ROUTES = {
  login: '/auth/login',
  register: '/auth/register',
  dashboard: '/dashboard',
} as const;

/** Secondary / account destinations surfaced in the authenticated shell. */
export const ACCOUNT_NAV: AppNavItem[] = [
  { label: 'Dashboard', to: AUTH_ROUTES.dashboard, match: ['/dashboard'] },
  { label: 'My Donations', to: '/donations', match: ['/donations'] },
  { label: 'Notifications', to: '/notifications', match: ['/notifications'] },
  { label: 'Volunteer', to: '/volunteer/manage', match: ['/volunteer/manage'] },
];

/**
 * Footer link groups. Only links that resolve to real, functional pages are
 * listed — a public visitor clicking a footer link must never hit a 404 or a
 * dead placeholder. (Volunteer/About/Impact and Transparency/Privacy/Terms
 * pages do not exist yet, so those links are intentionally omitted until the
 * functionality ships.)
 */
export interface FooterNavGroup {
  heading: string;
  links: { label: string; to: string }[];
}

export const FOOTER_NAV_GROUPS: FooterNavGroup[] = [
  {
    heading: 'Explore',
    links: [
      { label: 'Discover campaigns', to: '/campaigns' },
      { label: 'Charities', to: '/charities' },
      { label: 'How it works', to: '/how-it-works' },
    ],
  },
];

/** Brand trust line shown in the footer. */
export const FOOTER_TRUST_LINE =
  'Every rupee is tracked from donation to impact — with verified charities and transparent reporting.';


export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';