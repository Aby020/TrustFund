import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VolunteerOpportunitiesPage from './volunteer-opportunities';
import type { VolunteerApplication, VolunteerOpportunity } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockListAllOpportunities = vi.fn();
const mockListAllApplications = vi.fn();

vi.mock('@/services/volunteers', () => ({
  listAllOpportunities: (...args: unknown[]) => mockListAllOpportunities(...args),
  listAllApplications: (...args: unknown[]) => mockListAllApplications(...args),
  getOpportunity: vi.fn(),
  createApplication: vi.fn(),
  getApplication: vi.fn(),
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

const OPPORTUNITIES: VolunteerOpportunity[] = [
  makeOpportunity({
    id: 1,
    title: 'Beach cleanup',
    description: 'Help clean the shoreline.',
    location: 'Kochi',
  }),
  makeOpportunity({
    id: 2,
    title: 'Food bank sorting',
    charity_name: 'Feeding India',
    description: 'Sort donations at the food bank.',
    location: 'Mumbai',
  }),
  makeOpportunity({
    id: 3,
    title: 'Tree planting',
    charity_name: 'GreenEarth',
    status: 'CLOSED',
  }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <VolunteerOpportunitiesPage />
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerOpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAllOpportunities.mockResolvedValue(OPPORTUNITIES);
    mockListAllApplications.mockResolvedValue([]);
  });

  it('renders the volunteer nav', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Volunteer management' })).toBeInTheDocument();
    });
  });

  it('renders opportunity cards with organization and title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beach cleanup' })).toBeInTheDocument();
    });
    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText('Feeding India')).toBeInTheDocument();
  });

  it('renders the partnered campaign when present', async () => {
    mockListAllOpportunities.mockResolvedValueOnce([
      makeOpportunity({ title: 'Tree planting', status: 'OPEN', campaign_title: 'Green City Drive' }),
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Green City Drive/)).toBeInTheDocument();
    });
  });

  it('links each card to its detail page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Beach cleanup/ })).toHaveAttribute(
        'href',
        '/volunteer/manage/opportunities/1',
      );
    });
  });

  it('shows an applied badge for opportunities the volunteer applied to', async () => {
    const application: VolunteerApplication = {
      id: 9,
      opportunity: 1,
      opportunity_title: 'Beach cleanup',
      volunteer: 7,
      volunteer_name: 'Asha',
      status: 'PENDING',
      statement: '',
      applied_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };
    mockListAllApplications.mockResolvedValueOnce([application]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Applied · Pending/)).toBeInTheDocument();
    });
  });

  it('filters by search text client-side', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beach cleanup' })).toBeInTheDocument();
    });
    await user.type(screen.getByRole('searchbox', { name: 'Search opportunities' }), 'food');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food bank sorting' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Beach cleanup' })).not.toBeInTheDocument();
  });

  it('filters by status client-side', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beach cleanup' })).toBeInTheDocument();
    });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by status' }),
      'OPEN',
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food bank sorting' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Tree planting' })).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no opportunities', async () => {
    mockListAllOpportunities.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No opportunities yet')).toBeInTheDocument();
    });
  });

  it('shows the error state when loading fails', async () => {
    mockListAllOpportunities.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Could not load opportunities')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});