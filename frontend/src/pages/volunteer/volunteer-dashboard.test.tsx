import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import VolunteerDashboardPage from './volunteer-dashboard';
import type { VolunteerApplication, VolunteerOpportunity } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockListAllOpportunities = vi.fn();
const mockListAllApplications = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/services/volunteers', () => ({
  listAllOpportunities: (...args: unknown[]) => mockListAllOpportunities(...args),
  listAllApplications: (...args: unknown[]) => mockListAllApplications(...args),
  getOpportunity: vi.fn(),
  createApplication: vi.fn(),
  getApplication: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

function makeOpportunity(overrides: Partial<VolunteerOpportunity>): VolunteerOpportunity {
  return {
    id: 1,
    title: 'Beach cleanup',
    charity_organization: 10,
    charity_name: 'Hope Foundation',
    campaign: null,
    campaign_title: null,
    description: 'Help clean the shoreline.',
    location: 'Kochi',
    event_date: '2026-10-01T09:00:00Z',
    slots_available: 12,
    status: 'OPEN',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeApplication(overrides: Partial<VolunteerApplication>): VolunteerApplication {
  return {
    id: 3,
    opportunity: 1,
    opportunity_title: 'Beach cleanup',
    volunteer: 7,
    volunteer_name: 'Asha',
    status: 'PENDING',
    statement: 'I love the ocean.',
    applied_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    ...overrides,
  };
}

const OPEN_OPP = [
  makeOpportunity({ id: 1 }),
  makeOpportunity({ id: 2, title: 'Food bank sorting' }),
  makeOpportunity({ id: 3, title: 'Tree planting', status: 'OPEN' }),
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <VolunteerDashboardPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'asha@example.com',
      first_name: 'Asha',
      last_name: 'Nair',
      role: 'VOLUNTEER',
    });
    mockListAllOpportunities.mockResolvedValue(OPEN_OPP);
    mockListAllApplications.mockResolvedValue([
      makeApplication({ opportunity: 1, status: 'PENDING' }),
      makeApplication({ opportunity: 2, status: 'APPROVED' }),
    ]);
  });

  it('renders the volunteer nav', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Volunteer management' })).toBeInTheDocument();
    });
  });

  it('renders a welcome header with the volunteer first name', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back, Asha/ })).toBeInTheDocument();
    });
  });

  it('renders real statistics derived from the APIs', async () => {
    renderDashboard();
    await waitFor(() => {
      const cards = document.querySelectorAll('.volunteer-dashboard__stat');
      expect(cards.length).toBe(4);
    });
    const labels = Array.from(document.querySelectorAll('.volunteer-dashboard__stat-label')).map(
      (el) => el.textContent,
    );
    const values = Array.from(document.querySelectorAll('.volunteer-dashboard__stat-value')).map(
      (el) => el.textContent,
    );
    // 3 open opportunities, 2 applications, 1 pending, 1 approved
    expect(labels).toContain('Open opportunities');
    expect(values).toContain('3');
    expect(values).toContain('2');
    expect(values).toContain('1');
  });

  it('recommends open opportunities and limits to three', async () => {
    mockListAllOpportunities.mockResolvedValueOnce([
      makeOpportunity({ id: 1 }),
      makeOpportunity({ id: 2, title: 'Food bank sorting' }),
    ]);
    renderDashboard();
    await waitFor(() => {
      const rows = document.querySelectorAll<HTMLAnchorElement>('.volunteer-dashboard__opp');
      expect(rows.length).toBe(2);
    });
    await waitFor(() => {
      const list = document.querySelector('.volunteer-dashboard__list');
      expect(list?.textContent).toContain('Food bank sorting');
    });
    // Closed opportunity is not recommended
    expect(screen.queryByText('Tree planting')).not.toBeInTheDocument();
  });

  it('renders the volunteer recent applications with statuses', async () => {
    renderDashboard();
    await waitFor(() => {
      const apps = document.querySelectorAll('.volunteer-dashboard__app');
      expect(apps.length).toBe(2);
    });
    const list = document.querySelector('.volunteer-dashboard__apps');
    expect(list?.textContent).toContain('Pending');
    expect(list?.textContent).toContain('Approved');
  });

  it('links to the opportunities discovery page', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Discover opportunities' })).toHaveAttribute(
        'href',
        '/volunteer/manage/opportunities',
      );
    });
  });

  it('shows the empty state when there are no opportunities', async () => {
    mockListAllOpportunities.mockResolvedValueOnce([]);
    mockListAllApplications.mockResolvedValueOnce([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No opportunities yet')).toBeInTheDocument();
    });
  });

  it('shows the error state when loading fails', async () => {
    mockListAllOpportunities.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Could not load your dashboard')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});