'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';
import { clearOfflineScope } from './offline';

const USER_CACHE_KEY = 'cms_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  churchId: string | null;
  phone?: string | null;
  twoFactorEnabled?: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<{ requiresTwoFactor: boolean; twoFactorToken?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as Partial<User>;
    if (typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.role !== 'string') return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      role: user.role,
      churchId: user.churchId ?? null,
      phone: user.phone,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  } catch {
    return null;
  }
}

function setCachedUser(user: User) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function clearCachedUser() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_CACHE_KEY);
}

function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|network request failed|econnreset|timeout|aborted/i.test(message);
}

export function offlineScopeForUser(user: Pick<User, 'id' | 'churchId'> | null | undefined): string | null {
  return user ? `${user.id}:${user.churchId ?? 'none'}` : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (!getToken()) {
      setUser(null);
      clearCachedUser();
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
      setCachedUser(me);
    } catch (error) {
      if (isTransientNetworkError(error)) {
        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
          return;
        }
      }
      setToken(null);
      clearCachedUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string, twoFactorCode?: string) => {
    const result = await api<{
      user?: User;
      accessToken?: string;
      requiresTwoFactor: boolean;
      twoFactorToken?: string;
    }>('/auth/login', {
      method: 'POST',
      body: { email, password, twoFactorCode },
    });
    if (result.accessToken) {
      setToken(result.accessToken);
      setUser(result.user ?? null);
      if (result.user) setCachedUser(result.user);
    }
    return result;
  };

  const logout = () => {
    const scope = offlineScopeForUser(user);
    setToken(null);
    clearCachedUser();
    setUser(null);
    if (scope) void clearOfflineScope(scope).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
