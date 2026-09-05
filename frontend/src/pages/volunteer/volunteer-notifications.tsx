import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications';
import { formatDate } from '@/utils/format';
import type { ApiError, AppNotification } from '@/types/api';
import { VolunteerNav } from './volunteer-nav';
import './volunteer-notifications.css';

/**
 * VolunteerNotifications — displays the authenticated volunteer's notifications
 * with read/unread distinction and mark-read support. Notifications are
 * recipient-filtered by the backend, so a volunteer only sees their own.
 */
export default function VolunteerNotificationsPage() {
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

  useEffect(() => {
    load();
  }, [load]);

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
    <div className="volunteer-notifications">
      <Container>
        <MotionReveal>
          <VolunteerNav />
        </MotionReveal>

        <MotionReveal className="volunteer-notifications__header">
          <div>
            <p className="volunteer-notifications__overline">Notifications</p>
            <h1 className="volunteer-notifications__title">Notifications</h1>
            {loading && (
              <Skeleton variant="text" width={120} style={{ marginTop: 4 }} />
            )}
            {!loading && !error && (
              <p className="volunteer-notifications__subtitle">
                {count === 0
                  ? 'No notifications'
                  : unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                    : 'All caught up'}
              </p>
            )}
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
        </MotionReveal>

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
            description="Application updates and volunteer activity will appear here."
          />
        )}

        {!loading && !error && notifications.length > 0 && (
          <Card className="volunteer-notifications__list-card">
            <CardContent className="volunteer-notifications__list-body">
              <ul className="volunteer-notifications__list">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`volunteer-notifications__item${notification.is_read ? '' : ' volunteer-notifications__item--unread'}`}
                  >
                    <div className="volunteer-notifications__item-content">
                      <div className="volunteer-notifications__item-head">
                        {!notification.is_read && (
                          <span className="volunteer-notifications__dot" aria-label="Unread" />
                        )}
                        <h3 className="volunteer-notifications__item-title">
                          {notification.title}
                        </h3>
                        <Badge tone="neutral">
                          {notification.notification_type_display}
                        </Badge>
                      </div>
                      <p className="volunteer-notifications__item-message">
                        {notification.message}
                      </p>
                      <span className="volunteer-notifications__item-date">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(notification.id)}
                        className="volunteer-notifications__mark-read"
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
          <nav className="volunteer-notifications__pagination" aria-label="Notification pages">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="volunteer-notifications__page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </Container>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="volunteer-notifications__skeleton">
      <Card>
        <CardContent className="volunteer-notifications__list-body">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="block" height={80} style={{ marginBottom: 8 }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}