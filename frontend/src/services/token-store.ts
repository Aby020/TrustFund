/**
 * token-store — in-memory JWT access token with optional localStorage
 * persistence (guarded so private-mode browsers never crash us).
 *
 * Task 13B wires this to the real /api/v1/auth endpoints. For now the store
 * is the single place tokens are read/written, and `http.ts` calls
 * `getAccessToken()` on every request once auth is live.
 */

const STORAGE_KEY = 'trustfund.accessToken';
const REFRESH_KEY = 'trustfund.refreshToken';

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode / quota) — memory copy still works.
  }
}

export function getAccessToken(): string | null {
  return memoryAccess ?? safeRead(STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  return memoryRefresh ?? safeRead(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  memoryAccess = access;
  memoryRefresh = refresh;
  safeWrite(STORAGE_KEY, access);
  safeWrite(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  memoryAccess = null;
  memoryRefresh = null;
  safeWrite(STORAGE_KEY, null);
  safeWrite(REFRESH_KEY, null);
}