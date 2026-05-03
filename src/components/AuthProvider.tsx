'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearAccessToken, getAccessToken, getMe, login as apiLogin, logout as apiLogout, setAccessToken, type UserProfileDto } from '@/shared/api';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: UserProfileDto };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setState({ status: 'anonymous', user: null });
      return;
    }
    try {
      const me = await getMe();
      setState({ status: 'authenticated', user: me });
    } catch {
      clearAccessToken();
      setState({ status: 'anonymous', user: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener('auth:refresh', onRefresh as EventListener);
    return () => window.removeEventListener('auth:refresh', onRefresh as EventListener);
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const token = await apiLogin(username, password);
    setAccessToken(token.accessToken);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearAccessToken();
      setState({ status: 'anonymous', user: null });
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, refresh, login, logout }), [state, refresh, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider is missing');
  return ctx;
}
