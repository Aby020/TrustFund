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
  | 'chevron-down';

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
