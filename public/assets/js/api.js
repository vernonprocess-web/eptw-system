// ============================================================================
// CORE API CLIENT & AUTHENTICATED FETCH WRAPPER
// ============================================================================

export const API_BASE = '';

/**
 * Standard fetch wrapper for ePTW API endpoints.
 * Automatically sends same-origin HttpOnly session cookies and handles 401 redirects.
 */
export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Non-authoritative UI metadata headers for legacy audit compatibility
  const activeEmail = localStorage.getItem('active_user_email');
  const activeRole = localStorage.getItem('active_user_role');
  if (activeEmail && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', activeEmail);
  }
  if (activeRole && !headers.has('X-User-Role')) {
    headers.set('X-User-Role', activeRole);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  if (response.status === 401) {
    localStorage.removeItem('active_user_email');
    localStorage.removeItem('active_user_role');
    localStorage.removeItem('active_user_name');
    localStorage.removeItem('active_user_key');

    const path = window.location.pathname || '';
    if (!path.endsWith('/login.html') && !endpoint.startsWith('/api/auth/')) {
      const currentTarget = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login.html?redirect=${encodeURIComponent(currentTarget)}`);
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || 'Authentication required. Please sign in with your 6-digit PIN.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `HTTP ${response.status} ${response.statusText}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
