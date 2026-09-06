import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Skeleton } from '@/components';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications';
import { formatDate } from '@/utils/format';
import type { ApiError, AppNotification } from '@/types/api';
import './admin-notifications.css';

/**
 * AdminNotifications — the administrator's notification inbox with
 * read/unread distinction and mark-read support. Notifications are
 * recipient-filtered by the backend, so an admin only sees their own.
 */
export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications(page);
      setNotifications(data.results);
      setCount(data.count);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      // Silently fail — user can retry.
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Silently fail — user can retry.
    } finally {
      setMarkingAll(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / 20));

  return (
    <div className="admin-notifications">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Notifications</h1>
          <p className="admin-page-header__subtitle">
            {loading
              ? 'Loading…'
              : !error && count > 0
                ? unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'
                : 'No notifications'}
          </p>
        </div>
        {!loading && !error && unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </Button>
        )}
      </div>

      {loading && <NotificationsSkeleton />}

      {!loading && error && (
        <ErrorState
          title="Could not load notifications"
          description={error.message}
          actions={<Button variant="primary" onClick={load}>Try again</Button>}
        />
      )}

      {!loading && !error && notifications.length === 0 && (
        <EmptyState
          title="No notifications yet"
          description="Platform activity alerts will appear here."
        />
      )}

      {!loading && !error && notifications.length > 0 && (
        <Card className="admin-notifications__list-card">
          <CardContent className="admin-notifications__list-body">
            <ul className="admin-notifications__list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`admin-notifications__item${notification.is_read ? '' : ' admin-notifications__item--unread'}`}
                >
                  <div className="admin-notifications__item-content">
                    <div className="admin-notifications__item-head">
                      {!notification.is_read && (
                        <span className="admin-notifications__dot" aria-label="Unread" />
                      )}
                      <h3 className="admin-notifications__item-title">
                        {notification.title}
                      </h3>
                      <Badge tone="neutral">
                        {notification.notification_type_display}
                      </Badge>
                    </div>
                    <p className="admin-notifications__item-message">
                      {notification.message}
                    </p>
                    <span className="admin-notifications__item-date">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(notification.id)}
                      className="admin-notifications__mark-read"
                      aria-label={`Mark "${notification.title}" as read`}
                    >
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav className="admin-pagination" aria-label="Notification pages">
          <span>{count} notification{count === 1 ? '' : 's'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="admin-notifications__skeleton">
      <Card>
        <CardContent className="admin-notifications__list-body">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="block" height={80} style={{ marginBottom: 8 }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}