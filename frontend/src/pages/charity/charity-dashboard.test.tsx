import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import CharityDashboardPage from './charity-dashboard';

/* -------------------------------------------------------------------------- */
/*  Mock services                                                              */
/* -------------------------------------------------------------------------- */

const mockGetCharityDashboard = vi.fn();
const mockListCampaigns = vi.fn();

vi.mock('@/services/dashboard', () => ({
  getDonorDashboard: vi.fn(),
  getCharityDashboard: (...args: unknown[]) => mockGetCharityDashboard(...args),
}));

vi.mock('@/services/campaigns', () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  getCampaign: vi.fn(),
  listCampaignUpdates: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  createCampaignUpdate: vi.fn(),
  updateCampaignUpdate: vi.fn(),
  deleteCampaignUpdate: vi.fn(),
}));

const DASHBOARD = {
  organization: { id: 1, name: 'Hope Foundation', verification_status: 'VERIFIED', is_verified: true },
  campaigns_count: 3,
  active_campaigns_count: 2,
  total_raised: '250000',
  recent_donations: [
    { id: 1, campaign_title: 'Help Build a School', donor_name: 'Priya', amount: '5000', created_at: '2026-09-01T00:00:00Z' },
  ],
};

const CAMPAIGNS = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      organization: 1,
      organization_name: 'Hope Foundation',
      organization_verified: true,
      title: 'Help Build a School',
      description: 'Building a school.',
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
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <CharityDashboardPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('CharityDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharityDashboard.mockResolvedValue(DASHBOARD);
    mockListCampaigns.mockResolvedValue(CAMPAIGNS);
  });

  it('renders the charity nav', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Charity management' })).toBeInTheDocument();
    });
  });

  it('renders the organization name and verified badge', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders real dashboard metrics', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('₹2,50,000')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the recent campaigns list', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });
    // The campaigns list is inside a MotionReveal (whileInView); use DOM query
    await waitFor(() => {
      const campaignList = document.querySelector('.charity-dashboard__list');
      expect(campaignList).toBeInTheDocument();
    });
    expect(screen.getAllByText('Help Build a School').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a recent donation', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });
    // Donations are inside a MotionReveal (whileInView); use DOM query
    await waitFor(() => {
      const donationMeta = document.querySelector('.charity-dashboard__donation-meta');
      expect(donationMeta?.textContent).toContain('Priya');
    });
  });

  it('links to create a campaign', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Create campaign' })).toHaveAttribute(
        'href',
        '/charity/manage/campaigns/new',
      );
    });
  });

  it('renders empty dashboard for charity user without an organization', async () => {
    mockGetCharityDashboard.mockResolvedValueOnce({
      organization: null,
      campaigns_count: 0,
      active_campaigns_count: 0,
      total_raised: '0.00',
      recent_donations: [],
    });
    renderDashboard();
    // Stats are inside motion.div (stagger animation); use DOM query
    await waitFor(() => {
      const stats = document.querySelectorAll('.charity-dashboard__stat-value');
      expect(stats.length).toBe(4);
      expect(stats[0].textContent).toContain('₹0');
    });
    // No org banner
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Verification pending')).not.toBeInTheDocument();
    // Empty campaigns state (inside MotionReveal)
    await waitFor(() => {
      expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
    });
  });

  it('shows error state when the dashboard fails to load', async () => {
    mockGetCharityDashboard.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Could not load your dashboard')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
