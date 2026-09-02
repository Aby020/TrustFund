import type { ReactNode, SVGProps } from 'react';

/**
 * Icon — a small set of inline, stroke-based SVG glyphs (no emoji, per the
 * design system). Each icon is a set of <path> children on a shared 24×24
 * viewBox; `currentColor` inherits the surrounding text color.
 */

export type IconName =
  | 'menu'
  | 'close'
  | 'arrow-right'
  | 'heart'
  | 'shield'
  | 'check'
  | 'spark'
  | 'user'
  | 'dashboard'
  | 'logout'
  | 'chevron-down'
  | 'search'
  | 'eye'
  | 'receipt'
  | 'wallet'
  | 'trending-up'
  | 'calendar'
  | 'target'
  | 'users'
  | 'building';

const ICONS: Record<IconName, ReactNode> = {
  menu: (
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  close: (
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
  'arrow-right': (
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  heart: (
    <path
      d="M12 19.5S5 15.3 3.2 11.8C1.9 9.3 3.4 6.2 6.6 6.2c2 0 3.4 1.1 4 2.4.6-1.3 2-2.4 4-2.4 3.2 0 4.7 3.1 3.4 5.6C19 15.3 12 19.5 12 19.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  shield: (
    <>
      <path d="M12 3l7 2.8v5.1c0 4.3-2.5 7.7-7 9.6-4.5-1.9-7-5.3-7-9.6V5.8L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 11.7l2.1 2.1 3.8-3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  spark: (
    <path
      d="M12 4l1.6 4.9L18.5 10.5 13.6 12 12 17 10.4 12 5.5 10.5 10.4 8.9 12 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c1.4-2.9 3.9-4.4 7-4.4s5.6 1.5 7 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 8.5L19.5 12 16 15.5M19 12H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'chevron-down': (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
    </>
  ),
  'trending-up': (
    <path d="M3 17l5-5 4 4 9-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c1.4-2.9 3.9-4.4 6-4.4s4.6 1.5 6 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M21 20c-.9-2-3-3.4-5.5-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  building: (
    <>
      <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 21v-4h6v4M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  /** Pixel size; the glyph stays centered in its box. */
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
