import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components';
import { cx } from '@/utils/cx';
import './charity-nav.css';

interface CharityNavItem {
  label: string;
  to: string;
  icon: IconName;
  /** Paths that should keep this item active (parent matches). */
  match: string[];
}

/** Authenticated charity navigation — links shared by the charity area pages. */
const CHARITY_NAV: CharityNavItem[] = [
  { label: 'Dashboard', to: '/charity/manage', icon: 'dashboard', match: ['/charity/manage'] },
  { label: 'Campaigns', to: '/charity/manage/campaigns', icon: 'target', match: ['/charity/manage/campaigns'] },
  { label: 'Volunteers', to: '/charity/manage/volunteers', icon: 'users', match: ['/charity/manage/volunteers'] },
  { label: 'Organization', to: '/charity/manage/organization', icon: 'building', match: ['/charity/manage/organization'] },
  { label: 'Notifications', to: '/charity/manage/notifications', icon: 'spark', match: ['/charity/manage/notifications'] },
];

/**
 * CharityNav — horizontal sub-navigation for the authenticated charity area.
 * Uses NavLink so the active item gets an animated underline; icons clarify
 * each destination on small screens.
 */
export function CharityNav({ className }: { className?: string }) {
  return (
    <nav className={cx('charity-nav', className)} aria-label="Charity management">
      {CHARITY_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/charity/manage'}
          className={({ isActive }) =>
            cx('charity-nav__link', isActive && 'is-active')
          }
        >
          <Icon name={item.icon} size={18} aria-hidden="true" />
          <span className="charity-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}