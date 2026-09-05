import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import VolunteerApplicationDetailPage from './volunteer-application-detail';
import type { VolunteerApplication, VolunteerOpportunity } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const mockGetApplication = vi.fn();
const mockGetOpportunity = vi.fn();

vi.mock('@/services/volunteers', () => ({
  listAllOpportunities: vi.fn(),
  listAllApplications: vi.fn(),
  getOpportunity: (...args: unknown[]) => mockGetOpportunity(...args),
  createApplication: vi.fn(),
  getApplication: (...args: unknown[]) => mockGetApplication(...args),
}));

const APPLICATION: VolunteerApplication = {
  id: 3,
  opportunity: 1,
  opportunity_title: 'Beach cleanup',
  volunteer: 7,
  volunteer_name: 'Asha',
  status: 'PENDING',
  statement: 'I love the ocean and want to help.',
  applied_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
};

const OPPORTUNITY: VolunteerOpportunity = {
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
};

function renderDetail(id = '3') {
  return render(
    <MemoryRouter initialEntries={[`/volunteer/manage/applications/${id}`]}>
      <Routes>
        <Route
          path="/volunteer/manage/applications/:id"
          element={<VolunteerApplicationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('VolunteerApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApplication.mockResolvedValue(APPLICATION);
    mockGetOpportunity.mockResolvedValue(OPPORTUNITY);
  });

  it('renders the application opportunity and organization', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Beach cleanup' })).toBeInTheDocument();
    });
    expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
  });

  it('renders the status, statement, and dates', async () => {
    renderDetail();
    await waitFor(() => {
      // Pending appears in the header badge and the status card.
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText('I love the ocean and want to help.')).toBeInTheDocument();
    const rows = document.querySelector('.volunteer-application-detail__rows');
    expect(rows?.textContent).toContain('Kochi');
    expect(rows?.textContent).toContain('Submitted');
  });

  it('links back to the opportunity', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Beach cleanup' })).toHaveAttribute(
        'href',
        '/volunteer/manage/opportunities/1',
      );
    });
  });

  it('shows an error state when the application cannot be loaded', async () => {
    mockGetApplication.mockRejectedValueOnce({ status: 404, message: 'Not found' });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Could not load this application')).toBeInTheDocument();
    });
  });
});