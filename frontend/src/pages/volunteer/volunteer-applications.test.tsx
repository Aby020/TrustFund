import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VolunteerApplicationsPage from './volunteer-applications';
import type { VolunteerApplication, VolunteerOpportunity } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockListAllApplications = vi.fn();
const mockListAllOpportunities = vi.fn();

vi.mock('@/services/volunteers', () => ({
  listAllOpportunities: (...args: unknown[]) => mockListAllOpportunities(...args),
  listAllApplications: (...args: unknown[]) => mockListAllApplications(...args),
  getOpportunity: vi.fn(),
  createApplication: vi.fn(),
  getApplication: vi.fn(),
}));

function makeApplication(overrides: Partial<VolunteerApplication>): VolunteerApplication {
  return {
    id: 3,
    opportunity: 1,
    opportunity_title: 'Beach cleanup',
    volunteer: 7,
    volunteer_name: 'Asha',
    status: 'PENDING',
    statement: '',
    applied_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    ...overrides,
  };
}

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

const APPLICATIONS: VolunteerApplication[] = [
  makeApplication({ id: 3, status: 'PENDING' }),
  makeApplication({ id: 4, opportunity: 2, opportunity_title: 'Food bank sorting', status: 'APPROVED' }),
  makeApplication({ id: 5, opportunity: 3, opportunity_title: 'Tree planting', status: 'REJECTED' }),
];

const OPPORTUNITIES: VolunteerOpportunity[] = [
  makeOpportunity({ id: 1, title: 'Beach cleanup', charity_name: 'Hope Foundation' }),
  makeOpportunity({ id: 2, title: 'Food bank sorting', charity_name: 'Feeding India' }),
  makeOpportunity({ id: 3, title: 'Tree planting', charity_name: 'GreenEarth' }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <VolunteerApplicationsPage />
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAllApplications.mockResolvedValue(APPLICATIONS);
    mockListAllOpportunities.mockResolvedValue(OPPORTUNITIES);
  });

  it('renders the volunteer nav', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Volunteer management' })).toBeInTheDocument();
    });
  });

  it('renders the volunteer own applications with organization and status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Food bank sorting')).toBeInTheDocument();
    });
    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText('Feeding India')).toBeInTheDocument();
    // Status badges live inside the rows; the filter select also lists them.
    const list = document.querySelector('.volunteer-applications__list');
    expect(list?.textContent).toContain('Approved');
    expect(list?.textContent).toContain('Rejected');
  });

  it('links each application to its detail page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Beach cleanup/ })).toHaveAttribute(
        'href',
        '/volunteer/manage/applications/3',
      );
    });
  });

  it('does not expose other volunteers applications', async () => {
    // The service is back by a server-filtered endpoint, but this page must
    // only ever render what the service returns — nothing fabricated.
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Beach cleanup')).toBeInTheDocument();
    });
    const rows = document.querySelectorAll('.volunteer-applications__row');
    expect(rows.length).toBe(3);
  });

  it('filters by status client-side', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Beach cleanup')).toBeInTheDocument();
    });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter applications by status' }),
      'APPROVED',
    );
    await waitFor(() => {
      expect(screen.getByText('Food bank sorting')).toBeInTheDocument();
    });
    expect(screen.queryByText('Beach cleanup')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no applications', async () => {
    mockListAllApplications.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No applications yet')).toBeInTheDocument();
    });
  });

  it('shows the error state when loading fails', async () => {
    mockListAllApplications.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Could not load your applications')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});