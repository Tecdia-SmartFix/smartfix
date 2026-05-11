import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../api/apiClient';
import { useAuth } from './AuthContext';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(12);
  const { user } = useAuth();

  /**
   * GET /admin/alerts — fetches all alerts, newest first.
   * Only runs when the user is an admin.
   */
  const fetchAlerts = async () => {
    if (user.role !== 'admin') return;
    try {
      const data = await fetchApi('/admin/alerts');
      if (data) {
        setAlerts(data.alerts || []);
        if (data.threshold !== undefined) {
          setAlertThreshold(data.threshold);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user.role]);

  /**
   * DELETE /admin/alerts — clears all alert history.
   * Maps to the "Clear All History" button in the Admin Dashboard.
   */
  const clearAlerts = async () => {
    try {
      await fetchApi('/admin/alerts', { method: 'DELETE' });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  /**
   * POST /admin/alerts/test — injects a synthetic alert for email pipeline verification.
   */
  const testAlert = async () => {
    try {
      await fetchApi('/admin/alerts/test', { method: 'POST' });
      await fetchAlerts(); // Refresh the list to show the new test alert
      return { success: true };
    } catch (err) {
      console.error('Failed to inject test alert:', err);
      return { success: false, error: err.detail || 'Test alert failed' };
    }
  };

  return (
    <AlertContext.Provider value={{
      alerts,
      alertThreshold,
      clearAlerts,
      testAlert,
      refreshAlerts: fetchAlerts,
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlerts must be used within AlertProvider');
  return context;
};
