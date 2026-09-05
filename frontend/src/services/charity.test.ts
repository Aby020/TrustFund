import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http } from './http';
import { createOrganization } from './charity';

vi.mock('./http', () => ({
  http: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));

const mockPost = vi.mocked(http.post);

describe('createOrganization', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({} as never);
  });

  it('omits blank optional fields so the backend applies its model defaults', async () => {
    await createOrganization({
      name: 'Hope Foundation',
      description: 'Helping communities.',
      email: 'org@example.com',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      registration_number: 'REG-123',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/charities/create/', {
      name: 'Hope Foundation',
      description: 'Helping communities.',
      email: 'org@example.com',
      phone: undefined,
      website: undefined,
      address: undefined,
      city: undefined,
      state: undefined,
      country: undefined,
      registration_number: 'REG-123',
    });
  });

  it('passes through populated optional fields unchanged', async () => {
    await createOrganization({
      name: 'Hope Foundation',
      description: '',
      email: 'org@example.com',
      phone: '+91 98765 43210',
      website: 'https://example.org',
      address: 'MG Road',
      city: 'Kochi',
      state: 'KL',
      country: 'India',
      registration_number: 'REG-123',
    });

    const arg = mockPost.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(arg).toMatchObject({
      name: 'Hope Foundation',
      email: 'org@example.com',
      phone: '+91 98765 43210',
      website: 'https://example.org',
      address: 'MG Road',
      city: 'Kochi',
      state: 'KL',
      country: 'India',
      registration_number: 'REG-123',
    });
  });

  it('posts to the create endpoint, not the list endpoint', async () => {
    await createOrganization({
      name: 'N',
      description: '',
      email: 'e@e.com',
      registration_number: 'R',
    });
    expect(mockPost.mock.calls[0]?.[0]).toBe('/api/v1/charities/create/');
  });
});