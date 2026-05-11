import React, { createContext, useContext } from 'react';
import { fetchApi } from '../api/apiClient';
import { useAuth } from './AuthContext';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const { fetchSession } = useAuth();

  /**
   * POST /auth/request-link { email }
   * Server always returns 200 (to prevent email enumeration).
   * Actual email is only sent to allowlisted addresses.
   */
  const requestLoginLink = async (email) => {
    try {
      await fetchApi('/auth/request-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true };
    } catch (err) {
      // 422 = invalid email format
      return { success: false, error: err.detail || 'Failed to request link.' };
    }
  };

  /**
   * Reads ?login_error from the current URL.
   * The server sets this param when redirecting after an invalid/expired token:
   *   GET /auth/verify?token=... → 302 /?login_error=expired
   *
   * Call this on AdminLogin mount.
   * @returns {string|null} Error message to show, or null.
   */
  const checkLoginError = () => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('login_error');
    if (err === 'expired') {
      return 'This login link has expired or was already used. Please request a new one.';
    }
    if (err) {
      return `Login failed: ${err}`;
    }
    return null;
  };

  /**
   * Called after the browser lands on / following a successful magic-link redirect.
   * The server already set the session cookie, so we just refresh /auth/me.
   */
  const refreshAfterVerify = async () => {
    await fetchSession();
  };

  const adminLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    await fetchSession();
  };

  return (
    <AdminAuthContext.Provider
      value={{ requestLoginLink, checkLoginError, refreshAfterVerify, adminLogout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
