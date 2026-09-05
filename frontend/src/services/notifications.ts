/**
 * notifications — service layer for the authenticated user's notifications.
 * Uses the shared http client. Ownership is enforced server-side (recipient).
 */
import { http } from './http';
import type { AppNotification, Paginated } from '@/types/api';

/** Fetch the current user's notifications (paginated). */
export function listNotifications(page = 1) {
  return http.get<Paginated<AppNotification>>('/api/v1/notifications/', {
    params: { page },
  });
}

/** Mark a single notification as read. */
export function markNotificationRead(id: number) {
  return http.post<AppNotification>(`/api/v1/notifications/${id}/mark_read/`);
}

/** Mark every notification for the current user as read. */
export function markAllNotificationsRead() {
  return http.post<{ status: string; updated_count: number }>(
    '/api/v1/notifications/mark_all_read/',
  );
}
