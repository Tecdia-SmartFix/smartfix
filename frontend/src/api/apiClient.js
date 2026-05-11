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
