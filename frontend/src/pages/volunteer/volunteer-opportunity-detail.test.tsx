import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import VolunteerOpportunityDetailPage from './volunteer-opportunity-detail';
import type { VolunteerApplication, VolunteerOpportunity } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockGetOpportunity = vi.fn();
const mockListAllApplications = vi.fn();
const mockCreateApplication = vi.fn();

vi.mock('@/services/volunteers', () => ({
  listAllOpportunities: vi.fn(),
  listAllApplications: (...args: unknown[]) => mockListAllApplications(...args),
  getOpportunity: (...args: unknown[]) => mockGetOpportunity(...args),
  createApplication: (...args: unknown[]) => mockCreateApplication(...args),
  getApplication: vi.fn(),
}));

const OPPORTUNITY: VolunteerOpportunity = {
  id: 1,
  title: 'Beach cleanup',
  charity_organization: 10,
  charity_name: 'Hope Foundation',
  campaign: 5,
  campaign_title: 'Green City Drive',
  description: 'Help clean the shoreline.',
  location: 'Kochi',
  event_date: '2026-10-01T09:00:00Z',
  slots_available: 12,
  status: 'OPEN',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

function makeApplication(overrides: Partial<VolunteerApplication>): VolunteerApplication {
  return {
    id: 3,
    opportunity: 1,
    opportunity_title: 'Beach cleanup',
    volunteer: 7,
    volunteer_name: 'Asha',
    status: 'PENDING',
    statement: 'I love the ocean.',
    applied_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    ...overrides,
  };
}

function renderDetail(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/volunteer/manage/opportunities/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route
            path="/volunteer/manage/opportunities/:id"
            element={<VolunteerOpportunityDetailPage />}
          />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerOpportunityDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpportunity.mockResolvedValue(OPPORTUNITY);
    mockListAllApplications.mockResolvedValue([]);
    mockCreateApplication.mockResolvedValue(makeApplication({}));
  });

  it('renders the opportunity details, organization, and campaign', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beach cleanup' })).toBeInTheDocument();
    });
    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    expect(screen.getByText(/Green City Drive/)).toBeInTheDocument();
    expect(document.querySelector('.volunteer-opportunity-detail__meta')?.textContent).toContain('Kochi');
  });

  it('shows the apply form to apply when open and not yet applied', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Apply to volunteer')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Submit application' }),
    ).toBeInTheDocument();
  });

  it('submits an application and shows the submitted state', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Apply to volunteer')).toBeInTheDocument();
    });
    await user.type(
      screen.getByLabelText(/Why would you like to volunteer/),
      'I love the ocean.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith({
        opportunity: 1,
        statement: 'I love the ocean.',
      });
    });
    // Applied status card renders the just-submitted success banner
    await waitFor(() => {
      expect(screen.getByText('Your application')).toBeInTheDocument();
    });
    // Toast + inline success banner both say "Application submitted"
    expect(screen.getAllByText('Application submitted').length).toBeGreaterThanOrEqual(2);
    // Pending badge (header + status card)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  });

  it('submits without a statement when left blank', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Apply to volunteer')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith({ opportunity: 1, statement: undefined });
    });
  });

  it('treats a duplicate-application 400 as already applied', async () => {
    mockCreateApplication.mockRejectedValueOnce({
      status: 400,
      message: 'You have already applied to this opportunity.',
    });
    mockListAllApplications.mockResolvedValueOnce([]);
    // The catch block re-fetches applications to reconcile the applied state.
    mockListAllApplications.mockResolvedValueOnce([makeApplication({})]);

    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Apply to volunteer')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(screen.getByText('Your application')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  });

  it('hides the apply form when the volunteer already applied', async () => {
    mockListAllApplications.mockResolvedValueOnce([makeApplication({ status: 'APPROVED' })]);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Your application')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a closed note instead of the apply form for closed opportunities', async () => {
    mockGetOpportunity.mockResolvedValueOnce({ ...OPPORTUNITY, status: 'CLOSED' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.getByText('This opportunity is no longer open for applications.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    mockGetOpportunity.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Could not load this opportunity')).toBeInTheDocument();
    });
  });
});