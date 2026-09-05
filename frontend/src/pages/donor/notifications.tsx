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
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notifications';
import { formatDate } from '@/utils/format';
import type { ApiError, AppNotification } from '@/types/api';
import { DonorNav } from './donor-nav';
import './notifications.css';

/**
 * Notifications — displays the authenticated donor's notifications with
 * read/unread distinction, mark-read support, and all standard states.
 */
export default function NotificationsPage() {
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
    <div className="notifications">
      <Container>
        <MotionReveal>
          <DonorNav />
        </MotionReveal>

        <MotionReveal className="notifications__header">
          <div>
            <h1 className="notifications__title">Notifications</h1>
            {loading && (
              <Skeleton variant="text" width={120} style={{ marginTop: 4 }} />
            )}
            {!loading && !error && (
              <p className="notifications__subtitle">
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
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState
            title="No notifications yet"
            description="When something happens with your donations or campaigns, you will be notified here."
          />
        )}

        {!loading && !error && notifications.length > 0 && (
          <Card className="notifications__list-card">
            <CardContent className="notifications__list-body">
              <ul className="notifications__list">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`notifications__item${notification.is_read ? '' : ' notifications__item--unread'}`}
                  >
                    <div className="notifications__item-content">
                      <div className="notifications__item-head">
                        {!notification.is_read && (
                          <span className="notifications__dot" aria-label="Unread" />
                        )}
                        <h3 className="notifications__item-title">
                          {notification.title}
                        </h3>
                        <Badge tone="neutral">
                          {notification.notification_type_display}
                        </Badge>
                      </div>
                      <p className="notifications__item-message">
                        {notification.message}
                      </p>
                      <span className="notifications__item-date">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(notification.id)}
                        className="notifications__mark-read"
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
          <nav className="notifications__pagination" aria-label="Notification pages">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="notifications__page-info">
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
    <div className="notifications__skeleton">
      <Card>
        <CardContent className="notifications__list-body">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="block" height={80} style={{ marginBottom: 8 }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
