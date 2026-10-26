import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { registerSessionExpiredHandler } from '@/shared/api/http-client';
import type { Me } from '@/shared/api/types';

import { authApi } from './api';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  me: Me | null;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [me, setMe] = useState<Me | null>(null);
  const queryClient = useQueryClient();

  const endSession = useCallback(() => {
    setStatus('anonymous');
    setMe(null);
    queryClient.clear();
  }, [queryClient]);

  // The mock session lives in memory only, so a reload always starts "checking"
  // and resolves to "anonymous" once GET /v1/me fails. onSessionExpired (below)
  // ends up doing the actual state transition in that case too.
  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((user) => {
        if (cancelled) return;
        queryClient.setQueryData(['me'], user);
        setMe(user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on mount
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(endSession);
  }, [endSession]);

  const logIn = useCallback(
    async (email: string, password: string) => {
      const { device_session_token: token } = await authApi.login(email, password);
      await authApi.issue(token);
      const user = await authApi.getMe();
      queryClient.setQueryData(['me'], user);
      setMe(user);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const logOut = useCallback(async () => {
    try {
      await authApi.revoke();
    } finally {
      endSession();
    }
  }, [endSession]);

  return (
    <AuthContext.Provider value={{ status, me, logIn, logOut }}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
