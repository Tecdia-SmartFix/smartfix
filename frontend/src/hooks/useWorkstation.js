import { useEffect, useState } from 'react';
import { fetchApi } from '../api/apiClient';

/**
 * Single-shot probe of GET /workstation on mount.
 *
 * If the caller's IP is in `data/workstations.json`, the backend returns
 *   { bound: true, ip, machine: { id, display_name, category, ... } }
 * and sets a `worker_session` cookie inline so the next /query is authenticated.
 *
 * If unbound:
 *   { bound: false, ip }
 * and the frontend falls back to the existing LandingPage → MachinesPage flow.
 *
 * Network failure is treated as "unbound" so the app never gets stuck on a
 * loading spinner when the backend is down.
 */
export function useWorkstation() {
  const [state, setState] = useState({
    loading: true,
    bound: false,
    machine: null,
    ip: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchApi(`/workstation?_t=${Date.now()}`)
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          bound: !!data?.bound,
          machine: data?.machine || null,
          ip: data?.ip || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, bound: false, machine: null, ip: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
