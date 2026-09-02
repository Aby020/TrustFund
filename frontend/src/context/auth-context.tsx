/**
 * auth-context — the authentication *shape* only.
 *
 * Task 13A intentionally provides a stub: `useAuth()` already exposes the
 * contract future pages and the AppShell will consume, but no network calls
 * happen here yet. Task 13B plugs in real login/logout behind this same API,
 * so pages written against `useAuth()` won't change.
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

export type AuthStatus =
  | 'authenticated' // access token present
  | 'anonymous' // logged out
  | 'restoring'; // (future) validating a stored token on boot

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'DONOR' | 'CHARITY' | 'VOLUNTEER' | 'ADMIN';
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Login + logout are no-ops until Task 13B wires the JWT endpoints. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = useCallback(async (_email: string, _password: string) => {
    // Intentionally unimplemented in 13A — see file header.
    throw new Error('Authentication will be wired in Task 13B.');
  }, []);

  const logout = useCallback(async () => {
    // Intentionally unimplemented in 13A.
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: 'anonymous',
      user: null,
      login,
      logout,
    }),
    [login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within <AuthProvider>.');
  }
  return context;
}

export { AuthContext };