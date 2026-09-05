import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import CharityCampaignsPage from './charity-campaigns';

/* -------------------------------------------------------------------------- */
/*  Mock services                                                              */
/* -------------------------------------------------------------------------- */

const mockGetMyOrganization = vi.fn();
const mockListCampaigns = vi.fn();
const mockCancelCampaign = vi.fn();
const mockDeleteCampaign = vi.fn();

vi.mock('@/services/charity', () => ({
  getMyOrganization: (...args: unknown[]) => mockGetMyOrganization(...args),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  submitForVerification: vi.fn(),
  resubmitForVerification: vi.fn(),
  getVerificationHistory: vi.fn(),
}));

vi.mock('@/services/campaigns', () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  getCampaign: vi.fn(),
  listCampaignUpdates: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: (...args: unknown[]) => mockDeleteCampaign(...args),
  cancelCampaign: (...args: unknown[]) => mockCancelCampaign(...args),
  createCampaignUpdate: vi.fn(),
  updateCampaignUpdate: vi.fn(),
  deleteCampaignUpdate: vi.fn(),
}));

const ORG = { id: 1, name: 'Hope Foundation' };

const CAMPAIGNS = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      organization: 1,
      organization_name: 'Hope Foundation',
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CharityCampaignsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('CharityCampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyOrganization.mockResolvedValue(ORG);
    mockListCampaigns.mockResolvedValue(CAMPAIGNS);
    mockCancelCampaign.mockResolvedValue({});
    mockDeleteCampaign.mockResolvedValue(undefined);
  });

  it('renders the charity nav', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Charity management' })).toBeInTheDocument();
    });
  });

  it('renders campaign title and status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Help Build a School')).toBeInTheDocument();
    });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders campaign progress', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
    });
    expect(screen.getByText(/raised of ₹5,00,000/i)).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('links to the create campaign form', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Create campaign' })).toHaveAttribute(
        'href',
        '/charity/manage/campaigns/new',
      );
    });
  });

  it('links to edit a campaign', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
        'href',
        '/charity/manage/campaigns/1/edit',
      );
    });
  });

  it('shows empty state when there are no campaigns', async () => {
    mockListCampaigns.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
    });
  });

  it('shows error state on load failure', async () => {
    mockListCampaigns.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Could not load campaigns')).toBeInTheDocument();
    });
  });

  it('deletes a campaign after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete campaign' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Delete campaign' }));
    await waitFor(() => {
      expect(mockDeleteCampaign).toHaveBeenCalledWith(1);
    });
  });
});
