import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components';
import DonatePage from './donate';

/* -------------------------------------------------------------------------- */
/*  Mock the services                                                         */
/* -------------------------------------------------------------------------- */

const mockGetCampaign = vi.fn();
const mockInitiateDonation = vi.fn();

vi.mock('@/services/campaigns', () => ({
  listCampaigns: vi.fn(),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  listCampaignUpdates: vi.fn(),
}));

vi.mock('@/services/donations', () => ({
  initiateDonation: (...args: unknown[]) => mockInitiateDonation(...args),
  verifyPayment: vi.fn(),
  listMyDonations: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn().mockRejectedValue(new Error('No session')),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

const SAMPLE_CAMPAIGN = {
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
};

function renderDonate() {
  return render(
    <MemoryRouter initialEntries={['/campaigns/1/donate']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/campaigns/:id/donate" element={<DonatePage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('DonatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCampaign.mockResolvedValue(SAMPLE_CAMPAIGN);
  });

  it('renders the donation form heading', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /make a donation/i })).toBeInTheDocument();
    });
  });

  it('renders preset amount buttons', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /₹100/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /₹500/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /₹1,000/ })).toBeInTheDocument();
  });

  it('renders custom amount input', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByLabelText(/custom amount/i)).toBeInTheDocument();
    });
  });

  it('renders anonymous checkbox', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /donate anonymously/i })).toBeInTheDocument();
    });
  });

  it('renders message textarea', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByLabelText(/leave a message/i)).toBeInTheDocument();
    });
  });

  it('renders submit button', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /donate/i })).toBeInTheDocument();
    });
  });

  it('selecting a preset highlights it', async () => {
    const user = userEvent.setup();
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /₹500/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^₹500$/ }));
    expect(screen.getByRole('button', { name: /^₹500$/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables donate button until an amount is selected', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /donate/i })).toBeDisabled();
    });
    expect(mockInitiateDonation).not.toHaveBeenCalled();
  });

  it('back link points to campaign detail', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to/i })).toHaveAttribute(
        'href',
        '/campaigns/1',
      );
    });
  });

  it('shows error state for non-existent campaign', async () => {
    mockGetCampaign.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    renderDonate();
    await waitFor(() => {
      expect(screen.getByText('Campaign not found')).toBeInTheDocument();
    });
  });

  it('shows secure payment note', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByText(/processed securely via razorpay/i)).toBeInTheDocument();
    });
  });

  /* --- Accessibility ------------------------------------------------------ */

  it('form has aria-label', async () => {
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('form', { name: /make a donation/i })).toBeInTheDocument();
    });
  });

  it('error message has role="alert"', async () => {
    const user = userEvent.setup();
    mockInitiateDonation.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /donate/i })).toBeInTheDocument();
    });

    // Select an amount to enable the button, then submit
    await user.click(screen.getByRole('button', { name: /^₹100$/ }));
    await user.click(screen.getByRole('button', { name: /donate/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});
