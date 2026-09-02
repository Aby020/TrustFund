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

export const PUBLIC_NAV: AppNavItem[] = [
  { label: 'Campaigns', to: '/campaigns', match: ['/campaigns'] },
  { label: 'Charities', to: '/charities', match: ['/charities'] },
  { label: 'How it works', to: '/how-it-works', match: ['/how-it-works'] },
];

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';