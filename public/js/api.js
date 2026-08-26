/**
 * SecureID Client API Helper
 */

// If deployed with a separate backend, API_BASE can be configured here.
// In single-project Vercel deployment, same-origin "/api" is used.
const API_BASE = "/api";

let csrfToken = null;
let csrfRequest = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch(`${API_BASE}/csrf`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json().catch(() => ({}));
        csrfToken = data.csrfToken || null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const method = (options.method || "POST").toUpperCase();
  const needsCsrf = options.csrf !== false && !["GET", "HEAD", "OPTIONS"].includes(method);
  const requestCsrfToken = needsCsrf ? await getCsrfToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (requestCsrfToken) headers["X-CSRF-Token"] = requestCsrfToken;

  const config = {
    method,
    credentials: options.credentials || "same-origin",
    headers,
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.message || "An error occurred during request.");
      error.status = res.status;
      error.code = data.code || "REQUEST_FAILED";
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
