import { Outlet } from 'react-router-dom';
import { AdminNav } from './admin-nav';
import './admin-layout.css';

/**
 * AdminLayout — the administration frame. Renders the AdminNav sidebar plus
 * the routed page via <Outlet/>, and defines the shared admin page chrome
 * (page headers, filter bars, tables, pagination, stat cards, definition
 * lists and timelines) so every admin page stays visually consistent.
 */
export function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <AdminNav />
      </aside>
      <div className="admin-layout__content">
        <Outlet />
      </div>
    </div>
  );
}