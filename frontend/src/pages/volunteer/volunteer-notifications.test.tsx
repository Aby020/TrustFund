import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VolunteerNotificationsPage from './volunteer-notifications';
import type { AppNotification } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockListNotifications = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();

vi.mock('@/services/notifications', () => ({
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
}));

function makeNotification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 1,
    recipient: 7,
    notification_type: 'VOLUNTEER_APPROVED',
    notification_type_display: 'Volunteer approved',
    title: 'Application approved',
    message: 'Your application for Beach cleanup was approved.',
    is_read: false,
    created_at: '2026-09-03T00:00:00Z',
    ...overrides,
  };
}

const NOTIFICATIONS: AppNotification[] = [
  makeNotification({ id: 1 }),
  makeNotification({
    id: 2,
    notification_type: 'VOLUNTEER_REJECTED',
    notification_type_display: 'Volunteer rejected',
    title: 'Application update',
    message: 'Your application for Tree planting was not accepted.',
    is_read: true,
  }),
];

function pageResponse(results: AppNotification[]) {
  return { count: results.length, next: null, previous: null, results };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <VolunteerNotificationsPage />
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNotifications.mockResolvedValue(pageResponse(NOTIFICATIONS));
    mockMarkNotificationRead.mockResolvedValue({});
    mockMarkAllNotificationsRead.mockResolvedValue({ status: 'ok', updated_count: 1 });
  });

  it('renders the volunteer nav', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Volunteer management' })).toBeInTheDocument();
    });
  });

  it('renders notifications with unread/read distinction', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Application approved')).toBeInTheDocument();
    });
    expect(screen.getByText('Application update')).toBeInTheDocument();
    // 1 unread → dot + unread count
    expect(document.querySelectorAll('.volunteer-notifications__dot').length).toBe(1);
    expect(screen.getByText('1 unread notification')).toBeInTheDocument();
  });

  it('marks an individual notification as read', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Application approved')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: 'Mark "Application approved" as read' }),
    );
    await waitFor(() => {
      expect(mockMarkNotificationRead).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(document.querySelectorAll('.volunteer-notifications__dot').length).toBe(0);
    });
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Application approved')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => {
      expect(mockMarkAllNotificationsRead).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('All caught up')).toBeInTheDocument();
    });
  });

  it('shows the empty state when there are no notifications', async () => {
    mockListNotifications.mockResolvedValueOnce(pageResponse([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('shows the error state when loading fails', async () => {
    mockListNotifications.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Could not load notifications')).toBeInTheDocument();
    });
  });
});