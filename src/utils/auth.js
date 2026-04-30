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

function parseDateOnly(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function getTodayDateOnly() {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
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

  return user.expire_date < getTodayDateOnly();
}

export function formatExpireDate(value) {
  if (!value) {
    return '';
  }

  const date = parseDateOnly(value);

  if (!date) {
    return '';
  }

  return date.toLocaleDateString();
}

export function getExpireRemainingText(user = getCurrentUser()) {
  if (!user?.expire_date) {
    return '';
  }

  const expireDate = parseDateOnly(user.expire_date);

  if (!expireDate) {
    return '';
  }

  const today = parseDateOnly(getTodayDateOnly());
  const diff = expireDate.getTime() - today.getTime();

  if (diff <= 0) {
    return diff === 0 ? 'หมดอายุวันนี้' : 'หมดอายุแล้ว';
  }

  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return `เหลือ ${days} วัน`;
}

export function getUserAccessState(user = getCurrentUser()) {
  const locked = isUserLocked(user);
  const expired = isUserExpired(user);
  const isNewUser = Boolean(user?.new_user);

  let message = '';

  if (locked) {
    message = 'บัญชีของคุณถูกล็อก จึงยังไม่สามารถคำนวณได้';
  } else if (expired) {
    message = 'บัญชีของคุณหมดอายุแล้ว จึงยังไม่สามารถคำนวณได้';
  } else if (isNewUser) {
    message = 'user ใหม่ กรุณาเติมเงิน';
  }

  return {
    locked,
    expired,
    newUser: isNewUser,
    blocked: locked || expired || isNewUser,
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

  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const data = await requestAuth('/me', null, token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      setAuthNotice('');
      emitAuthChanged();
      return data.user;
    } catch (error) {
      lastError = error;

      if (error.message !== 'Unauthorized' || attempt === 3) {
        break;
      }

      await delay(300);
    }
  }

  setAuthNotice(lastError?.message || 'Unauthorized');
  logoutUser({ preserveNotice: true });
  throw lastError || new Error('Unauthorized');
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

export async function createAdminUser({ username, password, role, locked, new_user, expire_date }) {
  const data = await requestAdmin('', {
    method: 'POST',
    body: JSON.stringify({ username, password, role, locked, new_user, expire_date }),
  });

  return data.user;
}

export async function updateAdminUserAccess({ userId, role, locked, new_user, expire_date }) {
  const data = await requestAdmin('', {
    method: 'PATCH',
    body: JSON.stringify({ userId, role, locked, new_user, expire_date }),
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
