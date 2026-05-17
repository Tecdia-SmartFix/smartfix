import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../api/apiClient';
import { uploadMachine, pollJob } from '../api/apiClient';
import { useAuth } from './AuthContext';

const MachineContext = createContext();

export const MachineProvider = ({ children }) => {
  const [machines, setMachines] = useState([]);
  const [activeJob, setActiveJob] = useState(null); // { job_id, machine_id, status, step, progress, error }
  const { user } = useAuth();

  /**
   * Fetch machines from the correct endpoint based on role.
   * Admins get extra metadata (uploaded_at, uploaded_by, pdf_size_bytes) from /admin/machines.
   * Workers get filtered results from /machines.
   */
  const fetchMachines = useCallback(async () => {
    if (!user.authenticated) return;
    try {
      const endpoint = user.role === 'admin' ? '/admin/machines' : '/machines';
      const data = await fetchApi(endpoint);
      if (data && data.machines) {
        setMachines(data.machines.map(m => ({
          ...m,
          // Keep display_name as name for UI compatibility
          name: m.display_name || m.name || m.id,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    }
  }, [user.authenticated, user.role]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // ── Silent cross-user sync ──
  // When an admin uploads a new machine (or deletes one), other authenticated
  // users won't see it until they refresh. Polling /machines every 30s closes
  // that gap with negligible cost (tiny JSON, no LLM call). Polling pauses
  // when the tab is hidden so background tabs don't keep hammering the API.
  // Real-time push (SSE / WebSocket) is the v2 upgrade once state moves off
  // a single Python process.
  useEffect(() => {
    if (!user.authenticated) return;
    let intervalId = null;
    const start = () => {
      if (intervalId == null) intervalId = setInterval(fetchMachines, 30_000);
    };
    const stop = () => {
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMachines(); // catch up immediately on focus
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user.authenticated, fetchMachines]);

  /**
   * Start polling a job every 2 seconds until it's done or failed.
   * Per contract §4.3: poll while status is not "done" or "failed".
   */
  const startPolling = useCallback((jobId) => {
    const intervalId = setInterval(async () => {
      try {
        const job = await pollJob(jobId);
        setActiveJob(job);

        if (job.status === 'done') {
          clearInterval(intervalId);
          await fetchMachines(); // New machine now appears in /machines
        } else if (job.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Job poll failed:', err);
        clearInterval(intervalId);
        setActiveJob(prev => prev ? { ...prev, status: 'failed', error: err.detail || 'Polling error' } : null);
      }
    }, 2000);

    // Safety: stop polling after 10 minutes regardless
    setTimeout(() => clearInterval(intervalId), 10 * 60 * 1000);
  }, [fetchMachines]);

  /**
   * Upload a new machine PDF via POST /admin/machines (multipart/form-data).
   * Returns immediately with a job_id; caller should watch `activeJob` for progress.
   *
   * @param {FormData} formData  Built by AdminDashboard with all required fields.
   */
  const addMachine = async (formData) => {
    try {
      setActiveJob({ status: 'queued', step: 'Queuing upload…', progress: 0 });
      const result = await uploadMachine(formData);
      // result = { job_id, status: "queued" }
      setActiveJob({ job_id: result.job_id, status: result.status, step: 'Queued', progress: 0 });
      startPolling(result.job_id);
      return { success: true, job_id: result.job_id };
    } catch (err) {
      setActiveJob({ status: 'failed', error: err.detail || 'Upload failed' });
      return { success: false, error: err.detail || 'Upload failed', code: err.code };
    }
  };

  /** Clear the active job display (e.g. after user dismisses progress). */
  const clearActiveJob = () => setActiveJob(null);

  const deleteMachine = async (id) => {
    try {
      const result = await fetchApi(`/admin/machines/${id}`, { method: 'DELETE' });
      setMachines(prev => prev.filter(m => m.id !== id));
      return { success: true, deletedChunks: result.deleted_chunks };
    } catch (err) {
      return { success: false, error: err.detail || 'Deletion failed' };
    }
  };

  return (
    <MachineContext.Provider value={{
      machines,
      activeJob,
      addMachine,
      deleteMachine,
      clearActiveJob,
      refreshMachines: fetchMachines,
    }}>
      {children}
    </MachineContext.Provider>
  );
};

export const useMachines = () => {
  const context = useContext(MachineContext);
  if (!context) throw new Error('useMachines must be used within MachineProvider');
  return context;
};
