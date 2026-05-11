import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../api/apiClient';

const AuthContext = createContext();

/**
 * Domain values as defined in API Contract v2 §4.1.
 * Exported for use in the domain selector UI (LandingPage).
 */
export const EXPERTISE_DOMAINS = [
  'General',
  'Fabrication',
  'Manufacturing',
  'Additive Manufacturing',
  'Automation',
  'Heavy Machinery',
  'All Access',
];

/** Null/unauthenticated user shape */
const GUEST = {
  authenticated: false,
  role: null,
  domain: null,
  email: null,
  session_expires_at: null,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(GUEST);
  const [loading, setLoading] = useState(true);

  /**
   * Calls GET /auth/me — the single source of truth for session state.
   * Maps the contract response directly onto user state.
   */
  const fetchSession = async () => {
    try {
      const data = await fetchApi('/auth/me');
      if (data && data.authenticated) {
        setUser({
          authenticated: data.authenticated,
          role: data.role,           // "worker" | "admin"
          domain: data.domain,       // one of EXPERTISE_DOMAINS
          email: data.email || null,
          session_expires_at: data.session_expires_at || null,
        });
      } else {
        setUser(GUEST);
      }
    } catch (err) {
      // 401 → not authenticated
      setUser(GUEST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  /**
   * Worker login — POST /auth/worker-session { domain }.
   * Sets the worker_session cookie and refreshes /auth/me.
   */
  const login = async (domain) => {
    try {
      await fetchApi('/auth/worker-session', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
      await fetchSession();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.detail || 'Login failed' };
    }
  };

  /**
   * POST /auth/logout — clears session cookies server-side.
   */
  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear local state regardless
    }
    setUser(GUEST);
  };

  const isAdmin = user.role === 'admin';
  const isWorker = user.role === 'worker';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchSession, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
