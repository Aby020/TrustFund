import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import DonationDetailsPage from './donation-details';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                     */
/* -------------------------------------------------------------------------- */

const mockGetDonation = vi.fn();
const mockDownloadReceipt = vi.fn();

vi.mock('@/services/donations', () => ({
  getDonation: (...args: unknown[]) => mockGetDonation(...args),
  listMyDonations: vi.fn(),
  initiateDonation: vi.fn(),
  verifyPayment: vi.fn(),
}));

vi.mock('@/services/receipts', () => ({
  downloadReceipt: (...args: unknown[]) => mockDownloadReceipt(...args),
  listReceipts: vi.fn(),
  getReceipt: vi.fn(),
  downloadReceiptPdf: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn().mockRejectedValue(new Error('No session')),
  refreshAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

const SAMPLE_DONATION = {
  id: 7,
  donor: 3,
  donor_email: 'donor@test.com',
  campaign: 1,
  campaign_title: 'Help Build a School',
  campaign_image: null,
  amount: '250',
  currency: 'INR',
  status: 'SUCCESS',
  status_display: 'Success',
  razorpay_order_id: 'order_OzTest12345',
  razorpay_payment_id: 'pay_test123',
  razorpay_signature: 'sig_test',
  is_anonymous: false,
  message: 'Keep up the great work!',
  created_at: '2026-09-05T10:00:00Z',
  updated_at: '2026-09-05T10:00:00Z',
  receipt_id: 14,
  receipt_number: 'TRF-20260905-A45A9D',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/donations/7']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/donations/:id" element={<DonationDetailsPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('DonationDetailsPage – download receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDonation.mockResolvedValue(SAMPLE_DONATION);
  });

  it('shows the download button when a receipt is linked', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });
  });

  it('calls downloadReceipt with the receipt id and receipt number', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(mockDownloadReceipt).toHaveBeenCalledWith(14, 'TRF-20260905-A45A9D');
  });

  it('shows an error toast when the download fails', async () => {
    const user = userEvent.setup();
    mockDownloadReceipt.mockRejectedValue(new Error('Failed to download receipt (HTTP 500).'));

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/download failed/i);
    });
  });

  it('does not show the download button when no receipt exists', async () => {
    mockGetDonation.mockResolvedValue({
      ...SAMPLE_DONATION,
      status: 'PENDING',
      status_display: 'Pending',
      receipt_id: null,
      receipt_number: null,
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/receipt is available after successful payment/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
  });
});