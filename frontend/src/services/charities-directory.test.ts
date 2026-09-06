import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listVerifiedCharities } from './charities-directory';
import type { Campaign } from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  Mock the campaigns service so the directory only paginates real fixtures.  */
/* -------------------------------------------------------------------------- */

const mockListCampaigns = vi.fn();

vi.mock('./campaigns', () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
}));

/** Build a minimal but valid public Campaign fixture. */
function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    organization: 10,
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
    ...overrides,
  };
}

/** Simple paginated wrapper. */
function page(results: Campaign[], opts: { next?: string | null } = {}) {
  return {
    count: results.length,
    next: opts.next ?? null,
    previous: null,
    results,
  };
}

describe('listVerifiedCharities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups campaigns owned by the same organization into one charity', async () => {
    mockListCampaigns.mockResolvedValueOnce(
      page([
        campaign({ id: 1 }),
        campaign({ id: 2, title: 'Buy Library Books' }),
      ]),
    );

    const charities = await listVerifiedCharities();

    expect(mockListCampaigns).toHaveBeenCalledWith({ page: 1 });
    expect(charities).toHaveLength(1);
    expect(charities[0]).toMatchObject({
      id: 10,
      name: 'Hope Foundation',
      location: 'Mumbai',
      campaignCount: 2,
    });
    expect(charities[0].campaigns.map((c) => c.id)).toEqual([1, 2]);
  });

  it('collects distinct categories across a charity’s campaigns', async () => {
    mockListCampaigns.mockResolvedValueOnce(
      page([
        campaign({ category: 'EDUCATION', category_display: 'Education' }),
        campaign({ id: 2, category: 'EDUCATION', category_display: 'Education' }),
        campaign({ id: 3, category: 'COMMUNITY', category_display: 'Community' }),
      ]),
    );

    const charities = await listVerifiedCharities();

    expect(charities[0].categories).toEqual(['EDUCATION', 'COMMUNITY']);
  });

  it('never surfaces unverified organizations', async () => {
    mockListCampaigns.mockResolvedValueOnce(
      page([
        campaign(),
        campaign({ id: 2, organization: 11, organization_name: 'Not Verified Co', organization_verified: false }),
      ]),
    );

    const charities = await listVerifiedCharities();

    expect(charities).toHaveLength(1);
    expect(charities[0].name).toBe('Hope Foundation');
  });

  it('paginates until the last page', async () => {
    mockListCampaigns
      .mockResolvedValueOnce(page([campaign()], { next: 'http://x?page=2' }))
      .mockResolvedValueOnce(
        page([
          {
            ...campaign({ id: 2, organization: 11, organization_verified: false }),
          },
          campaign({ id: 3, organization: 11, organization_verified: false }),
        ]),
      );

    const charities = await listVerifiedCharities();

    expect(mockListCampaigns).toHaveBeenNthCalledWith(1, { page: 1 });
    expect(mockListCampaigns).toHaveBeenNthCalledWith(2, { page: 2 });
    // Second page only had unverified campaigns — nothing extra shown.
    expect(charities).toHaveLength(1);
  });

  it('sorts charities alphabetically by name', async () => {
    mockListCampaigns.mockResolvedValueOnce(
      page([
        campaign({ id: 1, organization: 1, organization_name: 'Zeta Trust' }),
        campaign({ id: 2, organization: 2, organization_name: 'Alpha Fund' }),
        campaign({ id: 3, organization: 3, organization_name: 'Milo Help' }),
      ]),
    );

    const charities = await listVerifiedCharities();

    expect(charities.map((c) => c.name)).toEqual(['Alpha Fund', 'Milo Help', 'Zeta Trust']);
  });
});