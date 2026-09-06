import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import AdminVerificationDetailPage from './admin-verification-detail';

/* -------------------------------------------------------------------------- */
/*  Mock the admin service                                                     */
/* -------------------------------------------------------------------------- */

const mockGetOrganization = vi.fn();
const mockGetVerificationHistory = vi.fn();
const mockApproveVerification = vi.fn();
const mockRejectVerification = vi.fn();

vi.mock('@/services/admin', () => ({
  getAdminDashboard: vi.fn(),
  getAdminAnalytics: vi.fn(),
  listOrganizations: vi.fn(),
  getOrganization: (...args: unknown[]) => mockGetOrganization(...args),
  approveVerification: (...args: unknown[]) => mockApproveVerification(...args),
  rejectVerification: (...args: unknown[]) => mockRejectVerification(...args),
  getVerificationHistory: (...args: unknown[]) => mockGetVerificationHistory(...args),
  listAdminUsers: vi.fn(),
  listAuditLogs: vi.fn(),
  listAdminCampaigns: vi.fn(),
  listAdminDonations: vi.fn(),
}));

const PENDING_ORG = {
  id: 3,
  owner: 2,
  owner_email: 'charity@example.com',
  owner_name: 'Charity Owner',
  name: 'Hope Foundation',
  description: 'We help underprivileged children get an education.',
  email: 'contact@hope.org',
  phone: '+91 98765 43210',
  website: 'https://hope.org',
  address: '42 Lake Road, Bengaluru',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  registration_number: 'REG-2026-001',
  verification_status: 'PENDING',
  verification_status_display: 'Pending',
  submitted_at: '2026-08-20T10:00:00Z',
  reviewed_at: null,
  reviewed_by: null,
  reviewed_by_name: null,
  verified_at: null,
  rejection_reason: null,
  created_at: '2026-08-20T09:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const VERIFIED_ORG = { ...PENDING_ORG, verification_status: 'VERIFIED', verification_status_display: 'Verified' };

const HISTORY = [
  {
    id: 10,
    action: 'SUBMIT',
    action_display: 'Submitted',
    performed_by: 2,
    performed_by_name: 'Charity Owner',
    from_status: 'PENDING',
    to_status: 'PENDING',
    reason: 'Organization created',
    created_at: '2026-08-20T09:00:00Z',
  },
];

function renderDetail(orgId = '3') {
  return render(
    <MemoryRouter initialEntries={[`/admin/manage/verifications/${orgId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/manage/verifications/:id" element={<AdminVerificationDetailPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('AdminVerificationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganization.mockResolvedValue(PENDING_ORG);
    mockGetVerificationHistory.mockResolvedValue(HISTORY);
    mockApproveVerification.mockResolvedValue(VERIFIED_ORG);
    mockRejectVerification.mockResolvedValue({ ...PENDING_ORG, verification_status: 'REJECTED' });
  });

  it('renders the organization name as the page heading', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hope Foundation');
    });
  });

  it('renders organization details', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
    });
    expect(screen.getByText(/underprivileged children/i)).toBeInTheDocument();
    expect(screen.getByText('contact@hope.org')).toBeInTheDocument();
  });

  it('shows Approve and Reject actions for a PENDING organization', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  it('renders the verification history timeline', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText(/Submitted/)).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /verification history/i })).toBeInTheDocument();
  });

  it('does not show Approve/Reject actions for an already-verified organization', async () => {
    mockGetOrganization.mockResolvedValueOnce(VERIFIED_ORG);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hope Foundation');
    });
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });

  it('approves the organization and confirms via toast', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockApproveVerification).toHaveBeenCalledWith(3);
    });
    await waitFor(() => {
      expect(screen.getByText('Organization approved')).toBeInTheDocument();
    });
    // Actions vanish after the org is verified.
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  it('requires a reason before rejecting', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /reject/i }));

    const confirmButton = await screen.findByRole('button', { name: /reject organization/i });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/rejection reason/i), 'The registration document is not legible.');
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });
  });

  it('rejects the organization with the provided reason', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /reject/i }));
    await user.type(
      screen.getByLabelText(/rejection reason/i),
      'The registration document is not legible.',
    );
    await user.click(await screen.findByRole('button', { name: /reject organization/i }));

    await waitFor(() => {
      expect(mockRejectVerification).toHaveBeenCalledWith(3, 'The registration document is not legible.');
    });
    await waitFor(() => {
      expect(screen.getByText('Organization rejected')).toBeInTheDocument();
    });
  });

  it('shows the stored rejection reason on a rejected organization', async () => {
    mockGetOrganization.mockResolvedValueOnce({
      ...PENDING_ORG,
      verification_status: 'REJECTED',
      reason: 'The registration document is not legible.',
      rejection_reason: 'The registration document is not legible.',
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('The registration document is not legible.')).toBeInTheDocument();
    });
  });

  it('shows an error state when the organization cannot be loaded', async () => {
    mockGetOrganization.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Could not load organization')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('surfaces backend validation errors from a rejected approval', async () => {
    const user = userEvent.setup();
    mockApproveVerification.mockRejectedValueOnce({ status: 400, message: 'Organization is not pending verification.' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText('Approval failed')).toBeInTheDocument();
    });
    expect(screen.getByText(/not pending verification/i)).toBeInTheDocument();
  });
});