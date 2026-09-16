'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/auth/me');
      setUser(me);
    } catch {
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
    }
    return result;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
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
