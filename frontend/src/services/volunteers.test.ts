import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http } from './http';
import {
  createApplication,
  getApplication,
  getOpportunity,
  listAllApplications,
  listAllOpportunities,
} from './volunteers';
import type { Paginated, VolunteerApplication, VolunteerOpportunity } from '@/types/api';

vi.mock('./http', () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);

const API_BASE = '/api/v1/volunteers';

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
  slots_available: 20,
  status: 'OPEN',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const APPLICATION: VolunteerApplication = {
  id: 3,
  opportunity: 1,
  opportunity_title: 'Beach cleanup',
  volunteer: 7,
  volunteer_name: 'Asha',
  status: 'PENDING',
  statement: 'I love the ocean.',
  applied_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
};

function paginated<T>(results: T[], next: string | null): Paginated<T> {
  return { count: results.length, next, previous: null, results };
}

describe('volunteers service', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  describe('getOpportunity', () => {
    it('GETs the individual opportunity endpoint', async () => {
      mockGet.mockResolvedValueOnce(OPPORTUNITY);
      await getOpportunity(42);
      expect(mockGet).toHaveBeenCalledWith(`${API_BASE}/opportunities/42/`);
    });
  });

  describe('createApplication', () => {
    it('POSTs the opportunity id and statement', async () => {
      mockPost.mockResolvedValueOnce(APPLICATION);
      await createApplication({ opportunity: 1, statement: 'I love the ocean.' });
      expect(mockPost).toHaveBeenCalledWith(`${API_BASE}/applications/`, {
        opportunity: 1,
        statement: 'I love the ocean.',
      });
    });

    it('omits the statement field when not provided', async () => {
      mockPost.mockResolvedValueOnce(APPLICATION);
      await createApplication({ opportunity: 1 });
      const arg = mockPost.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(arg).toEqual({ opportunity: 1 });
    });
  });

  describe('getApplication', () => {
    it('GETs the individual application endpoint', async () => {
      mockGet.mockResolvedValueOnce(APPLICATION);
      await getApplication(3);
      expect(mockGet).toHaveBeenCalledWith(`${API_BASE}/applications/3/`);
    });
  });

  describe('listAllOpportunities', () => {
    it('follows the pagination next links and flattens results', async () => {
      const oppA = { ...OPPORTUNITY, id: 1 };
      const oppB = { ...OPPORTUNITY, id: 2 };

      mockGet.mockImplementation(async (_url: unknown, config?: { params?: Record<string, unknown> }) => {
        const page = (config?.params?.page as number | undefined) ?? 1;
        if (page === 1) {
          return paginated([oppA], `${API_BASE}/opportunities/?page=2`);
        }
        return paginated([oppB], null);
      });

      const result = await listAllOpportunities();
      expect(result).toEqual([oppA, oppB]);
      expect(mockGet.mock.calls.length).toBe(2);
    });

    it('returns an empty list when there are no results', async () => {
      mockGet.mockResolvedValueOnce(paginated([], null));
      const result = await listAllOpportunities();
      expect(result).toEqual([]);
    });
  });

  describe('listAllApplications', () => {
    it('follows the pagination next links and flattens results', async () => {
      const appA = { ...APPLICATION, id: 3 };
      const appB = { ...APPLICATION, id: 4 };

      mockGet.mockImplementation(async (_url: unknown, config?: { params?: Record<string, unknown> }) => {
        const page = (config?.params?.page as number | undefined) ?? 1;
        if (page === 1) {
          return paginated([appA], `${API_BASE}/applications/?page=2`);
        }
        return paginated([appB], null);
      });

      const result = await listAllApplications();
      expect(result).toEqual([appA, appB]);
      expect(mockGet.mock.calls.length).toBe(2);
    });
  });
});