const TOKEN_KEY = 'onboard_ai_token';
const USER_KEY = 'onboard_ai_user';

export function getStoredAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function setStoredAuth(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const { token } = getStoredAuth();
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login')) {
      clearStoredAuth();
      if (typeof window !== 'undefined') {
        const message = data.error || 'Your session has expired. Please log in again.';
        window.dispatchEvent(new CustomEvent('onboardai:session-expired', {
          detail: { message }
        }));
      }
    }
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
