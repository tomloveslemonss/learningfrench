let csrfToken = null;

export async function initCsrf() {
  const response = await fetch('/api/csrf');
  const data = await response.json();
  csrfToken = data.csrfToken;
}

async function request(url, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function get(url) {
  return request(url);
}

export function post(url, body) {
  return request(url, { method: 'POST', body: JSON.stringify(body) });
}

export function patch(url, body) {
  return request(url, { method: 'PATCH', body: JSON.stringify(body) });
}
