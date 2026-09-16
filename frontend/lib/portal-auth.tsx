'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { portalApi, setPortalToken, getPortalToken, PortalMember } from './portal';

interface PortalAuthContextValue {
  member: PortalMember | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<PortalMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getPortalToken()) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const me = await portalApi<PortalMember>('/portal/me');
      setMember(me);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    const result = await portalApi<{ member: PortalMember; accessToken: string }>('/portal/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
    setPortalToken(result.accessToken);
    setMember(result.member);
  };

  const logout = () => {
    setPortalToken(null);
    setMember(null);
  };

  return (
    <PortalAuthContext.Provider value={{ member, loading, login, logout, refresh }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalProvider');
  return ctx;
}
