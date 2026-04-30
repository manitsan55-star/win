const CURRENT_USER_KEY = 'vin-number-current-user';
const AUTH_TOKEN_KEY = 'vin-number-auth-token';
const AUTH_NOTICE_KEY = 'vin-number-auth-notice';
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

function setAuthNotice(message) {
  if (!message) {
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

function emitAuthChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent('auth-changed', { detail }));
}

export async function registerUser({ username, password, confirmPassword }) {
  const data = await requestAuth('/register', {
    username,
    password,
    confirmPassword,
  });

  setAuthNotice('');
  saveSession(data);
  emitAuthChanged();

  return data.user;
}

export async function loginUser({ username, password }) {
  const data = await requestAuth('/login', {
    username,
    password,
  });

  setAuthNotice('');
  saveSession(data);
  emitAuthChanged();

  return data.user;
}

export function getCurrentUser() {
  const storedCurrentUser = localStorage.getItem(CURRENT_USER_KEY);
  return storedCurrentUser ? parseJson(storedCurrentUser, null) : null;
}

export function consumeAuthNotice() {
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return notice;
}

export function isUserLocked(user = getCurrentUser()) {
  return Boolean(user?.locked);
}

export function isUserExpired(user = getCurrentUser()) {
  if (!user?.expire_date) {
    return false;
  }

  const expireDate = new Date(user.expire_date);
  return !Number.isNaN(expireDate.getTime()) && expireDate.getTime() <= Date.now();
}

export function formatExpireDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}

export function getExpireRemainingText(user = getCurrentUser()) {
  if (!user?.expire_date) {
    return '';
  }

  const expireDate = new Date(user.expire_date);

  if (Number.isNaN(expireDate.getTime())) {
    return '';
  }

  const diff = expireDate.getTime() - Date.now();

  if (diff <= 0) {
    return 'หมดอายุแล้ว';
  }

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `เหลือ ${days} วัน`;
}

export function getUserAccessState(user = getCurrentUser()) {
  const locked = isUserLocked(user);
  const expired = isUserExpired(user);

  let message = '';

  if (locked) {
    message = 'บัญชีของคุณถูกล็อก จึงยังไม่สามารถคำนวณได้';
  } else if (expired) {
    message = 'บัญชีของคุณหมดอายุแล้ว จึงยังไม่สามารถคำนวณได้';
  }

  return {
    locked,
    expired,
    blocked: locked || expired,
    message,
    expireDateText: formatExpireDate(user?.expire_date),
    expireRemainingText: getExpireRemainingText(user),
  };
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
    setAuthNotice('');
    emitAuthChanged();
    return data.user;
  } catch (error) {
    setAuthNotice(error.message);
    logoutUser({ preserveNotice: true });
    throw error;
  }
}

export function logoutUser(options = {}) {
  if (!options.preserveNotice) {
    setAuthNotice('');
  }

  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  emitAuthChanged({ reason: options.reason || null });
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
