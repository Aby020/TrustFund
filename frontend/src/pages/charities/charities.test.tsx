import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import CharitiesPage from './charities';
import type { CharitySummary } from '@/services/charities-directory';

/* -------------------------------------------------------------------------- */
/*  Mock the charities directory service                                       */
/* -------------------------------------------------------------------------- */

const mockListVerifiedCharities = vi.fn();

vi.mock('@/services/charities-directory', () => ({
  listVerifiedCharities: (...args: unknown[]) => mockListVerifiedCharities(...args),
}));

const SAMPLE_CHARITIES: CharitySummary[] = [
  {
    id: 1,
    name: 'Hope Foundation',
    location: 'Mumbai',
    campaignCount: 1,
    categories: ['EDUCATION', 'CHILDREN'],
    campaigns: [
      { id: 1, title: 'Help Build a School', category: 'EDUCATION', category_display: 'Education' },
    ],
  },
  {
    id: 2,
    name: 'Green Earth',
    location: 'Delhi',
    campaignCount: 2,
    categories: ['ENVIRONMENT'],
    campaigns: [
      { id: 2, title: 'Plant 1000 Trees', category: 'ENVIRONMENT', category_display: 'Environment' },
      { id: 3, title: 'Clean the River', category: 'ENVIRONMENT', category_display: 'Environment' },
    ],
  },
];

function renderCharities() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CharitiesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('CharitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListVerifiedCharities.mockResolvedValue(SAMPLE_CHARITIES);
  });

  it('renders the page heading', async () => {
    renderCharities();
    // Await a resolved directory so the async data update is wrapped in act.
    await screen.findByText('Hope Foundation');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verified organizations/i);
  });

  it('shows a loading skeleton before data resolves', () => {
    mockListVerifiedCharities.mockReturnValue(new Promise(() => {}));
    renderCharities();
    expect(screen.getByLabelText(/loading charities/i)).toBeInTheDocument();
  });

  it('displays charity cards after loading', async () => {
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });
    expect(screen.getByText('Green Earth')).toBeInTheDocument();
    expect(screen.getAllByText('Verified')).toHaveLength(2);
  });

  it('links each charity to its live campaigns', async () => {
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('Help Build a School')).toBeInTheDocument();
    });

    const schoolLink = screen.getByRole('link', { name: /help build a school/i });
    expect(schoolLink).toHaveAttribute('href', '/campaigns/1');
    expect(screen.getByRole('link', { name: /plant 1000 trees/i })).toHaveAttribute('href', '/campaigns/2');
  });

  it('shows the campaign count per charity', async () => {
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('2 campaigns')).toBeInTheDocument();
    });
    expect(screen.getByText('1 campaign')).toBeInTheDocument();
  });

  it('shows an empty state when no charities exist', async () => {
    mockListVerifiedCharities.mockResolvedValueOnce([]);
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('No charities listed yet')).toBeInTheDocument();
    });
  });

  it('empty state offers a path to browse campaigns', async () => {
    mockListVerifiedCharities.mockResolvedValueOnce([]);
    renderCharities();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /browse campaigns/i })).toHaveAttribute('href', '/campaigns');
    });
  });

  it('shows an error state on API failure', async () => {
    mockListVerifiedCharities.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('Failed to load charities')).toBeInTheDocument();
    });
  });

  it('retries the request from the error state', async () => {
    mockListVerifiedCharities
      .mockRejectedValueOnce({ status: 500, message: 'Server error' })
      .mockResolvedValueOnce(SAMPLE_CHARITIES);

    const user = userEvent.setup();
    renderCharities();
    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    await waitFor(() => {
      expect(screen.getByText('Hope Foundation')).toBeInTheDocument();
    });
    expect(mockListVerifiedCharities).toHaveBeenCalledTimes(2);
  });

  it('reports the number of listed charities', async () => {
    renderCharities();
    await waitFor(() => {
      expect(screen.getByText('2 verified charities')).toBeInTheDocument();
    });
  });
});