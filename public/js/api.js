/**
 * SecureID Client API Helper
 */

// If deployed with a separate backend, API_BASE can be configured here.
// In single-project Vercel deployment, same-origin "/api" is used.
const API_BASE = "/api";

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || "POST",
    headers,
    ...options,
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.message || "An error occurred during request.");
      error.status = res.status;
      error.details = data.details || {};
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    const networkError = new Error("Network error. Please check your connection.");
    networkError.status = 0;
    networkError.details = {};
    throw networkError;
  }
}
