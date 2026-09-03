/**
 * auth — JWT authentication service for TrustFund.
 *
 * Handles:
 *  - Login, register, refresh, logout API calls
 *  - A refresh queue that batches concurrent 401 handlers
 *  - Wiring token-store into http via setTokenProvider
 *
 * The queue prevents a race where multiple simultaneous 401s each try to
 * refresh independently. Only one refresh fires; others await the result.
 */

import { http, setTokenProvider, setUnauthorizedHandler } from './http';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './token-store';
import type {
  AuthTokensResponse,
  TokenRefreshResponse,
  LoginRequest,
  RegisterRequest,
  LogoutRequest,
} from '@/types/api';

/* -------------------------------------------------------------------------- */
/*  HTTP hooks — wire token-store into the http client on module init.        */
/* -------------------------------------------------------------------------- */

setTokenProvider(getAccessToken);

/* -------------------------------------------------------------------------- */
/*  Refresh queue                                                             */
/* -------------------------------------------------------------------------- */

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new access token string.
 * On failure, clears tokens and throws.
 */
async function performRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await http.post<TokenRefreshResponse>(
      '/api/v1/auth/refresh/',
      { refresh: refreshToken },
      { auth: false },
    );

    // The backend may or may not rotate the refresh token.
    const newAccess = response.access;
    const newRefresh = response.refresh ?? refreshToken;
    setTokens(newAccess, newRefresh);
    return newAccess;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

/**
 * Queued refresh: ensures only one refresh request is in-flight at a time.
 * Concurrent callers share the same Promise.
 */
async function queuedRefresh(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = performRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

/* -------------------------------------------------------------------------- */
/*  401 handler — installed on http to auto-refresh on auth failures.         */
/* -------------------------------------------------------------------------- */

let onSessionExpired: (() => void) | null = null;

/**
 * Set a callback invoked when the session is truly expired (refresh failed).
 * Used by AuthProvider to transition to anonymous state.
 */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

/**
 * Handle a 401 by attempting a queued refresh.
 * If refresh succeeds, the http layer should retry the original request
 * (consumers can catch and re-throw; the token is now updated).
 * If refresh fails, the session is expired.
 */
async function handleUnauthorized(): Promise<void> {
  try {
    await queuedRefresh();
    // Token is now refreshed; the original request that triggered 401
    // already failed, but subsequent requests will use the new token.
  } catch {
    // Refresh failed — session is truly expired.
    onSessionExpired?.();
  }
}

// Register the 401 handler globally.
setUnauthorizedHandler(handleUnauthorized);

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Login with email and password. Stores tokens on success.
 */
export async function login(request: LoginRequest): Promise<AuthTokensResponse> {
  const response = await http.post<AuthTokensResponse>(
    '/api/v1/auth/login/',
    request,
    { auth: false },
  );

  setTokens(response.access, response.refresh);
  return response;
}

/**
 * Register a new user. Stores tokens on success.
 */
export async function register(request: RegisterRequest): Promise<AuthTokensResponse> {
  const response = await http.post<AuthTokensResponse>(
    '/api/v1/auth/register/',
    request,
    { auth: false },
  );

  setTokens(response.access, response.refresh);
  return response;
}

/**
 * Refresh the access token explicitly.
 * Returns the new access token.
 */
export async function refreshAccessToken(): Promise<string> {
  return queuedRefresh();
}

/**
 * Logout — blacklists the refresh token server-side and clears local tokens.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  // Best-effort server-side blacklist; clear local state regardless.
  if (refreshToken) {
    try {
      await http.post(
        '/api/v1/auth/logout/',
        { refresh: refreshToken } satisfies LogoutRequest,
        { auth: false },
      );
    } catch {
      // Logout endpoint may fail if refresh is already expired/blacklisted.
      // We still clear local tokens.
    }
  }

  clearTokens();
}

/**
 * Fetch the current user profile using the stored access token.
 */
export async function getCurrentUser() {
  return http.get<import('@/types/api').ApiUser>('/api/v1/auth/me/');
}
