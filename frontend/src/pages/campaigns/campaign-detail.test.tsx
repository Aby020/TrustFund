import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import CampaignDetailPage from './campaign-detail';

/* -------------------------------------------------------------------------- */
/*  Mock the campaigns service                                                 */
/* -------------------------------------------------------------------------- */

const mockGetCampaign = vi.fn();
const mockListCampaignUpdates = vi.fn();

vi.mock('@/services/campaigns', () => ({
  listCampaigns: vi.fn(),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  listCampaignUpdates: (...args: unknown[]) => mockListCampaignUpdates(...args),
}));

const SAMPLE_CAMPAIGN = {
  id: 1,
  organization: 1,
  organization_name: 'Hope Foundation',
  title: 'Help Build a School',
  description: 'Building a school for underprivileged children in rural India.',
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
};

const SAMPLE_UPDATES = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      campaign: 1,
      campaign_title: 'Help Build a School',
      title: 'Construction started!',
      content: 'We are excited to announce that construction has begun.',
      created_by: 1,
      created_by_name: 'Raj Kumar',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ],
};

function renderDetail(campaignId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('CampaignDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCampaign.mockResolvedValue(SAMPLE_CAMPAIGN);
    mockListCampaignUpdates.mockResolvedValue(SAMPLE_UPDATES);
  });

  it('renders the campaign title', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Help Build a School');
    });
  });

  it('renders organization name', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText(/Hope Foundation/)).toBeInTheDocument();
    });
  });

  it('renders campaign description', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText(/building a school for underprivileged/i)).toBeInTheDocument();
    });
  });

  it('renders funding progress', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
    });
    expect(screen.getByText(/of ₹5,00,000 goal/)).toBeInTheDocument();
  });

  it('renders progress percentage', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('renders Donate now button for active campaigns', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /donate now/i })).toHaveAttribute(
        'href',
        '/campaigns/1/donate',
      );
    });
  });

  it('renders campaign updates', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Construction started!')).toBeInTheDocument();
    });
    expect(screen.getByText(/we are excited to announce/i)).toBeInTheDocument();
    expect(screen.getByText('— Raj Kumar')).toBeInTheDocument();
  });

  it('renders category badge', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getAllByText('Education').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders campaign dates', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getAllByText(/started/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText(/ends/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state for non-existent campaign', async () => {
    mockGetCampaign.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Campaign not found')).toBeInTheDocument();
    });
  });

  it('shows browse campaigns link on error', async () => {
    mockGetCampaign.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /browse campaigns/i })).toHaveAttribute(
        'href',
        '/campaigns',
      );
    });
  });

  it('disables donate button for non-active campaigns', async () => {
    mockGetCampaign.mockResolvedValueOnce({
      ...SAMPLE_CAMPAIGN,
      status: 'COMPLETED',
      status_display: 'Completed',
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /completed/i })).toBeDisabled();
    });
  });

  it('renders the hero image with the campaign image URL and alt text', async () => {
    mockGetCampaign.mockResolvedValueOnce({
      ...SAMPLE_CAMPAIGN,
      image: 'http://localhost:8000/media/campaigns/education.webp',
    });
    renderDetail();
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Help Build a School' });
      expect(img).toHaveAttribute('src', 'http://localhost:8000/media/campaigns/education.webp');
    });
  });

  it('renders a placeholder (no img) when the campaign has no image', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Help Build a School' })).toHaveClass(
        'campaign-detail__hero-placeholder',
      );
    });
  });

  it('shows a verified charity badge for verified organizations', async () => {
    mockGetCampaign.mockResolvedValueOnce({
      ...SAMPLE_CAMPAIGN,
      organization_verified: true,
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Verified charity')).toBeInTheDocument();
    });
  });

  it('does not show a verified badge for unverified organizations', async () => {
    mockGetCampaign.mockResolvedValueOnce({
      ...SAMPLE_CAMPAIGN,
      organization_verified: false,
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(screen.queryByText('Verified charity')).not.toBeInTheDocument();
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('has proper heading hierarchy', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 2, name: /about this campaign/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /updates/i })).toBeInTheDocument();
  });

  it('funding progress has accessible progressbar', async () => {
    renderDetail();
    await waitFor(() => {
      const progressbar = screen.getAllByRole('progressbar');
      expect(progressbar.length).toBeGreaterThanOrEqual(1);
    });
  });
});
