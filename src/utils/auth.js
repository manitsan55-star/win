const CURRENT_USER_KEY = 'vin-number-current-user';
const AUTH_TOKEN_KEY = 'vin-number-auth-token';
const AUTH_API_BASE = '/api/auth';

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

async function requestAuth(path, payload, token) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${AUTH_API_BASE}${path}`, {
    method: payload ? 'POST' : 'GET',
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  return data;
}

function saveSession({ user, token }) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function emitAuthChanged() {
  window.dispatchEvent(new Event('auth-changed'));
}

export async function registerUser({ username, password, confirmPassword }) {
  const data = await requestAuth('/register', {
    username,
    password,
    confirmPassword,
  });

  saveSession(data);
  emitAuthChanged();

  return data.user;
}

export async function loginUser({ username, password }) {
  const data = await requestAuth('/login', {
    username,
    password,
  });

  saveSession(data);
  emitAuthChanged();

  return data.user;
}

export function getCurrentUser() {
  const storedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
  return storedCurrentUser ? parseJson(storedCurrentUser, null) : null;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getAuthToken();
}

export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

export async function restoreSession() {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const data = await requestAuth('/me', null, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    emitAuthChanged();
    return data.user;
  } catch (error) {
    logoutUser();
    throw error;
  }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  emitAuthChanged();
}

async function requestAdmin(path = '', options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/admin/users${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Admin request failed');
  }

  return data;
}

export async function fetchAdminUsers() {
  const data = await requestAdmin();
  return data.users || [];
}

export async function updateAdminUserAccess({ userId, role, locked, expire_date }) {
  const data = await requestAdmin('', {
    method: 'PATCH',
    body: JSON.stringify({ userId, role, locked, expire_date }),
  });

  const currentUser = getCurrentUser();

  if (currentUser && currentUser.id === data.user?.id) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    emitAuthChanged();
  }

  return data.user;
}

export async function deleteAdminUser(userId) {
  await requestAdmin('', {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}
