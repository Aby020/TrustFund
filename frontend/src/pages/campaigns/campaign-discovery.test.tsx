import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import CampaignDiscoveryPage from './campaign-discovery';

/* -------------------------------------------------------------------------- */
/*  Mock the campaigns service                                                 */
/* -------------------------------------------------------------------------- */

const mockListCampaigns = vi.fn();

vi.mock('@/services/campaigns', () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  getCampaign: vi.fn(),
  listCampaignUpdates: vi.fn(),
}));

const SAMPLE_CAMPAIGNS = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      organization: 1,
      organization_name: 'Hope Foundation',
      title: 'Help Build a School',
      description: 'Building a school for underprivileged children.',
      category: 'EDUCATION',
      category_display: 'Education',
      goal_amount: '500000',
      raised_amount: '125000',
      location: 'Mumbai',
      image: null,
      start_date: '2026-08-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
      status_display: 'Active',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
    },
    {
      id: 2,
      organization: 2,
      organization_name: 'Green Earth',
      title: 'Plant 1000 Trees',
      description: 'Reforestation initiative.',
      category: 'ENVIRONMENT',
      category_display: 'Environment',
      goal_amount: '200000',
      raised_amount: '180000',
      location: 'Delhi',
      image: null,
      start_date: '2026-07-01',
      end_date: '2026-10-15',
      status: 'ACTIVE',
      status_display: 'Active',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
    },
  ],
};

function renderDiscovery(searchParams = '') {
  const path = `/campaigns${searchParams ? `?${searchParams}` : ''}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <CampaignDiscoveryPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('CampaignDiscoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCampaigns.mockResolvedValue(SAMPLE_CAMPAIGNS);
  });

  it('renders the page heading', () => {
    renderDiscovery();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/find a cause/i);
  });

  it('renders search input', () => {
    renderDiscovery();
    expect(screen.getByRole('searchbox', { name: /search campaigns/i })).toBeInTheDocument();
  });

  it('renders category filter', () => {
    renderDiscovery();
    expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    renderDiscovery();
    expect(screen.getByRole('combobox', { name: /sort campaigns/i })).toBeInTheDocument();
  });

  it('displays campaign cards after loading', async () => {
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('Help Build a School')).toBeInTheDocument();
    });
    expect(screen.getByText('Plant 1000 Trees')).toBeInTheDocument();
    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
  });

  it('shows result count', async () => {
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('2 campaigns found')).toBeInTheDocument();
    });
  });

  it('calls API with default params', async () => {
    renderDiscovery();
    await waitFor(() => {
      expect(mockListCampaigns).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, ordering: '-created_at' }),
      );
    });
  });

  it('calls API with search param from URL', async () => {
    renderDiscovery('search=school');
    await waitFor(() => {
      expect(mockListCampaigns).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'school' }),
      );
    });
  });

  it('calls API with category filter from URL', async () => {
    renderDiscovery('category=EDUCATION');
    await waitFor(() => {
      expect(mockListCampaigns).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'EDUCATION' }),
      );
    });
  });

  it('shows empty state when no campaigns found', async () => {
    mockListCampaigns.mockResolvedValueOnce({
      count: 0, next: null, previous: null, results: [],
    });
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getAllByText('No campaigns found').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows error state on API failure', async () => {
    mockListCampaigns.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('Failed to load campaigns')).toBeInTheDocument();
    });
  });

  it('has retry button on error', async () => {
    mockListCampaigns.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('campaign cards link to detail pages', async () => {
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('Help Build a School')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link');
    const campaignLink = links.find((l) => l.getAttribute('href') === '/campaigns/1');
    expect(campaignLink).toBeInTheDocument();
  });

  it('displays pagination when there are multiple pages', async () => {
    mockListCampaigns.mockResolvedValueOnce({
      count: 24, next: 'next', previous: null, results: SAMPLE_CAMPAIGNS.results,
    });
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('results region has aria-live for screen readers', async () => {
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByText('2 campaigns found')).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('pagination has nav landmark', async () => {
    mockListCampaigns.mockResolvedValueOnce({
      count: 24, next: 'next', previous: null, results: SAMPLE_CAMPAIGNS.results,
    });
    renderDiscovery();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /campaign results pages/i })).toBeInTheDocument();
    });
  });
});
