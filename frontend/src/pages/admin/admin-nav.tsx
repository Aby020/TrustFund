import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components';
import { cx } from '@/utils/cx';
import './admin-nav.css';

interface AdminNavItem {
  label: string;
  to: string;
  icon: IconName;
}

/** Administration navigation — the primary sidebar for the admin area. */
const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin/manage', icon: 'dashboard' },
  { label: 'Verifications', to: '/admin/manage/verifications', icon: 'shield' },
  { label: 'Users', to: '/admin/manage/users', icon: 'users' },
  { label: 'Organizations', to: '/admin/manage/organizations', icon: 'building' },
  { label: 'Campaigns', to: '/admin/manage/campaigns', icon: 'target' },
  { label: 'Donations / Analytics', to: '/admin/manage/donations', icon: 'wallet' },
  { label: 'Audit Logs', to: '/admin/manage/audit-logs', icon: 'receipt' },
  { label: 'Notifications', to: '/admin/manage/notifications', icon: 'spark' },
];

/**
 * AdminNav — vertical sidebar (horizontal rail on small screens) shared by
 * every admin page. NavLink drives the active state; the sidebar marks the
 * platform-administration scope clearly.
 */
export function AdminNav({ className }: { className?: string }) {
  return (
    <nav className={cx('admin-nav', className)} aria-label="Administration">
      <p className="admin-nav__overline">Administration</p>
      <ul className="admin-nav__list">
        {ADMIN_NAV.map((item) => (
          <li key={item.to} className="admin-nav__item">
            <NavLink
              to={item.to}
              end={item.to === '/admin/manage'}
              className={({ isActive }) =>
                cx('admin-nav__link', isActive && 'is-active')
              }
            >
              <Icon name={item.icon} size={18} aria-hidden="true" />
              <span className="admin-nav__label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}