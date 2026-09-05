import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components';
import { cx } from '@/utils/cx';
import './volunteer-nav.css';

interface VolunteerNavItem {
  label: string;
  to: string;
  icon: IconName;
  /** Paths that should keep this item active (parent matches). */
  match: string[];
}

/** Authenticated volunteer navigation — links shared by the volunteer area pages. */
const VOLUNTEER_NAV: VolunteerNavItem[] = [
  { label: 'Dashboard', to: '/volunteer/manage', icon: 'dashboard', match: ['/volunteer/manage'] },
  { label: 'Opportunities', to: '/volunteer/manage/opportunities', icon: 'target', match: ['/volunteer/manage/opportunities'] },
  { label: 'My Applications', to: '/volunteer/manage/applications', icon: 'receipt', match: ['/volunteer/manage/applications'] },
  { label: 'Notifications', to: '/volunteer/manage/notifications', icon: 'spark', match: ['/volunteer/manage/notifications'] },
];

/**
 * VolunteerNav — horizontal sub-navigation for the authenticated volunteer
 * area. Uses NavLink so the active item gets an animated underline; icons
 * clarify each destination on small screens.
 */
export function VolunteerNav({ className }: { className?: string }) {
  return (
    <nav className={cx('volunteer-nav', className)} aria-label="Volunteer management">
      {VOLUNTEER_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/volunteer/manage'}
          className={({ isActive }) =>
            cx('volunteer-nav__link', isActive && 'is-active')
          }
        >
          <Icon name={item.icon} size={18} aria-hidden="true" />
          <span className="volunteer-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}