/**
 * http — tiny typed fetch client for the TrustFund Django/DRF API.
 *
 * Highlights:
 *  - Base URL from Vite env (`VITE_API_BASE_URL`, default `http://localhost:8000`).
 *  - JSON body parsing, network/timeout error normalization into `ApiError`.
 *  - Optional bearer token injected from `token-store` via `setTokenProvider`,
 *    plus a callback hook for 401 → refresh/redirect (wired in Task 13B).
 *  - `request<T>` handles any method; Raised odds of it are rare — keep it thin.
 *
 * Create domain services on top of this, e.g. `services/campaigns.ts`:
 *
 *   export const fetchCampaigns = (page = 1) =>
 *     request<Paginated<Campaign>>('/api/v1/campaigns/', { params: { page } });
 */

import type { ApiError } from '@/types/api';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000';

export const REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  /** Query params appended to the URL. */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Skip the Authorization header. */
  auth?: boolean;
}

let tokenProvider: (() => string | null) | null = null;
/** Called on a 401 response so auth can try to refresh + retry (13B). */
let unauthorizedHandler: ((cause: ApiError) => void) | null = null;

/** Inject the auth layer's token reader (see services/token-store.ts). */
export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

/** Register a handler for 401 responses (session expiry). */
export function setUnauthorizedHandler(handler: (cause: ApiError) => void): void {
  unauthorizedHandler = handler;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, params, auth = true, headers, ...rest } = options;

  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth && tokenProvider) {
    const token = tokenProvider();
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });

    if (response.status === 401) {
      const error = await toApiError(response, 401);
      unauthorizedHandler?.(error);
      throw error;
    }

    if (!response.ok) {
      throw await toApiError(response, response.status);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError: ApiError = {
        status: 0,
        message: 'The request timed out. Please try again.',
      };
      throw timeoutError;
    }
    if (isApiError(error)) throw error;
    throw toNetworkError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', json }),
  patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', json }),
  put: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', json }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/* ------------------------------------------------------------------------- */

function buildUrl(
  path: string,
  params?: RequestOptions['params'],
): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

function toNetworkError(error: unknown): ApiError {
  const detail = error instanceof Error ? error.message : undefined;
  return {
    status: 0,
    message: detail ? `Network error: ${detail}` : 'Network error. Please try again.',
  };
}

async function toApiError(response: Response, status: number): Promise<ApiError> {
  try {
    const body = (await response.json()) as unknown;
    const generic = body as Record<string, unknown>;
    const message =
      typeof generic?.detail === 'string'
        ? generic.detail
        : Array.isArray(generic?.non_field_errors)
          ? (generic.non_field_errors as string[]).join(' ')
          : `Request failed with status ${status}.`;

    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(generic)) {
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        fieldErrors[key] = value as string[];
      }
    }

    return { status, message, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined };
  } catch {
    return { status, message: `Request failed with status ${status}.` };
  }
}