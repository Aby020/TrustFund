/**
 * auth-context — the real authenticated state for TrustFund.
 *
 * Provides:
 *  - current user
 *  - authentication loading state
 *  - login / register / logout
 *  - session restoration on mount (reads stored tokens → fetches /me)
 *  - session-expired callback for token refresh failures
 *
 * Token refresh is handled by services/auth.ts; this context reacts to
 * session expiry by transitioning to anonymous state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  setSessionExpiredHandler,
} from '@/services/auth';
import type { ApiUser, UserRole } from '@/types/api';

export type AuthStatus =
  | 'authenticated'
  | 'anonymous'
  | 'restoring';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Map the API user shape (snake_case) to the frontend AuthUser shape. */
function toAuthUser(api: ApiUser): AuthUser {
  return {
    id: api.id,
    email: api.email,
    firstName: api.first_name,
    lastName: api.last_name,
    role: api.role,
  };
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Guard against state updates after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* --- Session restoration on mount --------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const me = await getCurrentUser();
        if (!cancelled && mountedRef.current) {
          setUser(toAuthUser(me));
          setStatus('authenticated');
        }
      } catch {
        // No valid session — stay anonymous.
        if (!cancelled && mountedRef.current) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    }

    restore();

    return () => { cancelled = true; };
  }, []);

  /* --- Session expiry handler (from services/auth.ts) --------------------- */
  const handleSessionExpired = useCallback(() => {
    if (mountedRef.current) {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(() => {});
  }, [handleSessionExpired]);

  /* --- Login -------------------------------------------------------------- */
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    if (mountedRef.current) {
      setUser(toAuthUser(response.user));
      setStatus('authenticated');
    }
  }, []);

  /* --- Register ----------------------------------------------------------- */
  const registerUser = useCallback(async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) => {
    const response = await apiRegister({
      email: data.email,
      password: data.password,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
    });
    if (mountedRef.current) {
      setUser(toAuthUser(response.user));
      setStatus('authenticated');
    }
  }, []);

  /* --- Logout ------------------------------------------------------------- */
  const logout = useCallback(async () => {
    await apiLogout();
    if (mountedRef.current) {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  /* --- Context value ------------------------------------------------------ */
  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register: registerUser, logout }),
    [status, user, login, registerUser, logout],
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
