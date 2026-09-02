# services — API layer

All network access goes through `http.ts`. Domain services wrap it so pages
never call `fetch` directly.

## Files

| File          | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `http.ts`     | Typed `fetch` client: base URL, JSON, timeouts, error normalization, auth header injection. |
| `token-store.ts` | JWT access/refresh token persistence (in-memory + guarded localStorage). |

## Adding a domain service

Create one module per domain, e.g. `campaigns.ts`:

```ts
import { http } from './http';
import type { Paginated, Campaign } from '@/types';

export function fetchCampaigns(page = 1) {
  return http.get<Paginated<Campaign>>('/api/v1/campaigns/', { params: { page } });
}
```

## Auth integration (wired in Task 13B)

`http.ts` reads a token from `setTokenProvider(...)` and can call a registered
401 handler. When auth pages land:

```ts
setTokenProvider(getAccessToken);
setUnauthorizedHandler(async () => {
  // try refresh with getRefreshToken(); on failure → clearTokens() + redirect
});
```

## Conventions

- Paths are absolute from the API root (`/api/v1/...`).
- Use `Paginated<T>` for list endpoints; `ApiError` is thrown by every call.
- Never import `fetch` directly in components.