import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components';
import { cx } from '@/utils/cx';
import './donor-nav.css';

interface DonorNavItem {
  label: string;
  to: string;
  icon: IconName;
  /** Paths that should keep this item active (parent matches). */
  match: string[];
}

/** Authenticated donor navigation — links shared by the donor area pages. */
const DONOR_NAV: DonorNavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard', match: ['/dashboard'] },
  { label: 'My Donations', to: '/donations', icon: 'receipt', match: ['/donations'] },
  { label: 'Notifications', to: '/notifications', icon: 'spark', match: ['/notifications'] },
];

/**
 * DonorNav — horizontal sub-navigation for the authenticated donor area.
 * Uses NavLink so the active item gets an animated underline; icons clarify
 * each destination on small screens.
 */
export function DonorNav({ className }: { className?: string }) {
  return (
    <nav className={cx('donor-nav', className)} aria-label="Account">
      {DONOR_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          className={({ isActive }) =>
            cx(
              'donor-nav__link',
              isActive && 'is-active',
            )
          }
        >
          <Icon name={item.icon} size={18} aria-hidden="true" />
          <span className="donor-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
