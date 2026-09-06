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
const mockLoadRazorpaySdk = vi.fn();

// The SDK loader is replaced so tests never inject a real <script>.
vi.mock('@/services/razorpay', () => ({
  loadRazorpaySdk: (...args: unknown[]) => mockLoadRazorpaySdk(...args),
}));

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
    mockLoadRazorpaySdk.mockResolvedValue(undefined);
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

  /* --- Razorpay Checkout ------------------------------------------------ */

  const successResponse = {
    id: 1,
    razorpay_order_id: 'order_OzTest12345',
    amount: '250',
    currency: 'INR',
    status: 'PENDING',
  };

  it('creates the order, loads the SDK, then opens checkout', async () => {
    const user = userEvent.setup();
    const openMock = vi.fn();
    const RazorpayCtor = vi.fn().mockImplementation(() => ({ open: openMock, close: vi.fn() }));
    window.Razorpay = RazorpayCtor as unknown as typeof window.Razorpay;

    mockInitiateDonation.mockResolvedValueOnce(successResponse);

    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /donate/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^₹100$/ }));
    await user.click(screen.getByRole('button', { name: /donate/i }));

    // Order created before the SDK is referenced, and the loader is awaited.
    await waitFor(() => {
      expect(mockInitiateDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign: 1,
          amount: 100,
          currency: 'INR',
          idempotency_key: expect.any(String),
        }),
      );
      expect(mockLoadRazorpaySdk).toHaveBeenCalled();
      expect(RazorpayCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // paise
          currency: 'INR',
          order_id: 'order_OzTest12345',
          name: 'TrustFund',
        }),
      );
      expect(openMock).toHaveBeenCalledTimes(1);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Razorpay;
  });

  it('shows a graceful error when the SDK cannot be loaded', async () => {
    const user = userEvent.setup();
    const RazorpayCtor = vi.fn();
    window.Razorpay = RazorpayCtor as unknown as typeof window.Razorpay;

    mockInitiateDonation.mockResolvedValueOnce(successResponse);
    // Persistent rejection: the mount preload also calls the loader, and its
    // failure must not mask the submit-path failure this test exercises.
    mockLoadRazorpaySdk.mockRejectedValue(new Error('Razorpay Checkout SDK failed to load.'));

    renderDonate();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /donate/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^₹100$/ }));
    await user.click(screen.getByRole('button', { name: /donate/i }));

    await waitFor(() => {
      expect(screen.getByText(/payment gateway is temporarily unavailable/i)).toBeInTheDocument();
    });
    // Checkout is never constructed when the SDK is unavailable.
    expect(RazorpayCtor).not.toHaveBeenCalled();
    // Donate button is re-enabled so the user can retry.
    expect(screen.getByRole('button', { name: /donate/i })).toBeEnabled();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Razorpay;
  });
});
