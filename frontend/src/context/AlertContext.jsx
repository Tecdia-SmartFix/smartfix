import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../api/apiClient';
import { useAuth } from './AuthContext';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(12);
  // Per-machine snooze map { machine_id: ISO timestamp } — alerts for those
  // machines are suppressed until that time. Pulled in by /admin/alerts so
  // the UI can show muted-state badges next to machine names.
  const [snoozes, setSnoozes] = useState({});
  const [dedupSeconds, setDedupSeconds] = useState(300);
  const { user } = useAuth();

  /**
   * GET /admin/alerts — fetches all alerts, newest first, plus the current
   * snooze map and dedup window. Only runs when the user is an admin.
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
        if (data.snoozes) setSnoozes(data.snoozes);
        if (data.dedup_seconds !== undefined) setDedupSeconds(data.dedup_seconds);
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

  /**
   * POST /admin/alerts/{id}/acknowledge — mark a single alert as handled.
   * Keeps the row in history (unlike clearAlerts which wipes all).
   */
  const acknowledgeAlert = async (alertId) => {
    try {
      await fetchApi(`/admin/alerts/${alertId}/acknowledge`, { method: 'POST' });
      await fetchAlerts();
      return { success: true };
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      return { success: false, error: err.detail || err.message };
    }
  };

  /**
   * POST /admin/alerts/snooze — suppress alerts for a machine for N minutes.
   * minutes=0 lifts an existing snooze.
   */
  const snoozeMachine = async (machineId, minutes) => {
    try {
      await fetchApi('/admin/alerts/snooze', {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId, minutes }),
      });
      await fetchAlerts();
      return { success: true };
    } catch (err) {
      console.error('Failed to snooze machine alerts:', err);
      return { success: false, error: err.detail || err.message };
    }
  };

  return (
    <AlertContext.Provider value={{
      alerts,
      alertThreshold,
      snoozes,
      dedupSeconds,
      clearAlerts,
      testAlert,
      acknowledgeAlert,
      snoozeMachine,
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
