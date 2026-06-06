/**
 * SmartFix API Client
 * Implements the SmartFix API Contract v2.
 * All requests include credentials: 'include' so HttpOnly session cookies are sent.
 * Auth credential handling is centralised here so a future switch from cookies
 * to Bearer tokens only requires changes in one place.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

export class ApiError extends Error {
  constructor(detail, code, status) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.name = 'ApiError';
    this.detail = detail;
    this.code = code || 'unknown_error';
    this.status = status;
  }
}

/**
 * Returns extra headers needed for auth.
 * Currently a no-op (cookies handle auth), but acts as a shim
 * for a future Bearer-token migration per §8 stability notes.
 */
export const getAuthHeaders = () => ({});

/**
 * Download a binary endpoint (xlsx/pdf) and let the user pick a save location.
 * Uses fetch + Blob so HttpOnly session cookies are sent the same way as JSON calls.
 *
 * In Chromium-based browsers the File System Access API shows a native "Save As"
 * dialog. Safari/Firefox fall through to the standard <a download> path, which
 * writes to the browser's default download folder.
 */
export const downloadFile = async (endpoint, fallbackName = 'download') => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try { detail = (await response.json()).detail || detail; } catch { /* binary body, leave as-is */ }
    throw new ApiError(detail, 'download_failed', response.status);
  }
  const disp = response.headers.get('content-disposition') || '';
  const match = disp.match(/filename="?([^";]+)"?/i);
  const name  = match ? match[1] : fallbackName;
  const blob  = await response.blob();

  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    const ext = name.split('.').pop().toLowerCase();
    const acceptMap = {
      xlsx: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      pdf:  { 'application/pdf': ['.pdf'] },
      csv:  { 'text/csv': ['.csv'] },
    };
    const types = acceptMap[ext]
      ? [{ description: `${ext.toUpperCase()} file`, accept: acceptMap[ext] }]
      : undefined;
    try {
      const handle   = await window.showSaveFilePicker({ suggestedName: name, types });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled the picker
      // Any other picker failure (e.g. permission policy) falls through to legacy download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Core fetch wrapper for JSON endpoints.
 */
export const fetchApi = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (data && data.detail) {
      throw new ApiError(data.detail, data.code, response.status);
    }
    throw new ApiError(`HTTP Error: ${response.status}`, 'http_error', response.status);
  }

  // Fail loud when a "successful" response carries no JSON. This usually
  // means the Vite dev proxy didn't catch the path and the SPA fallback
  // returned index.html — historically the failure mode whenever a new
  // /admin/<route> endpoint was added without updating vite.config.js.
  // Surfacing it as an explicit error beats letting downstream
  // `data.field` access crash with a confusing "cannot read properties
  // of undefined".
  if (data === undefined) {
    throw new ApiError(
      `Expected JSON from ${endpoint}; got ${contentType || 'no content-type'}. ` +
      'Likely a Vite proxy miss falling through to index.html — check vite.config.js.',
      'non_json_response',
      response.status,
    );
  }

  return data;
};

/**
 * Upload a new machine PDF via multipart/form-data.
 * DO NOT set Content-Type header — the browser will set it with the correct
 * multipart boundary automatically.
 *
 * @param {FormData} formData  Built by the caller with all required fields.
 * @returns {{ job_id: string, status: string }}
 */
export const uploadMachine = async (formData) => {
  const response = await fetch(`${API_BASE}/admin/machines`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(), // no Content-Type override — let browser set multipart boundary
    body: formData,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (data && data.detail) {
      throw new ApiError(data.detail, data.code, response.status);
    }
    throw new ApiError(`HTTP Error: ${response.status}`, 'http_error', response.status);
  }

  return data;
};

/**
 * Poll a single ingestion job.
 * @param {string} jobId
 * @returns {Promise<{job_id, machine_id, status, step, progress, started_at, finished_at, error}>}
 */
export const pollJob = async (jobId) => {
  return fetchApi(`/admin/jobs/${jobId}`);
};
