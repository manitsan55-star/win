import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const STORE_NAME = 'vin-number-auth';
const USER_KEY_PREFIX = 'user:';
const AVAILABLE_ROLES = ['admin', 'vip', 'user'];

function getStoreInstance() {
  return getStore(STORE_NAME);
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

export function methodNotAllowed(allowedMethods) {
  return jsonResponse({ error: 'Method not allowed' }, 405, {
    Allow: allowedMethods.join(', '),
  });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('invalid_json');
  }
}

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function getUserKey(username) {
  return `${USER_KEY_PREFIX}${normalizeUsername(username)}`;
}

function normalizeExpireDate(expireDate) {
  if (expireDate === null || expireDate === undefined || expireDate === '') {
    return null;
  }

  const parsedDate = new Date(expireDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('invalid_expire_date');
  }

  return parsedDate.toISOString();
}

function hydrateUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: AVAILABLE_ROLES.includes(user.role) ? user.role : 'user',
    locked: Boolean(user.locked),
    expire_date: normalizeExpireDate(user.expire_date),
    currentSessionId: typeof user.currentSessionId === 'string' ? user.currentSessionId : null,
  };
}

function isUserExpired(user) {
  if (!user?.expire_date) {
    return false;
  }

  return new Date(user.expire_date).getTime() <= Date.now();
}

function isActiveAdmin(user) {
  return user?.role === 'admin' && !user.locked && !isUserExpired(user);
}

function createSessionId() {
  return crypto.randomUUID();
}

export async function findUserByUsername(username) {
  const key = getUserKey(username);
  const user = await getStoreInstance().get(key, { type: 'json' });
  return hydrateUser(user);
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    locked: Boolean(user.locked),
    expire_date: user.expire_date || null,
    createdAt: user.createdAt,
  };
}

function getSeedAdminCredentials() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '').trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('missing_jwt_secret');
  }

  return secret;
}

function assertUserCanAccess(user) {
  if (user.locked) {
    throw new Error('account_locked');
  }

  if (isUserExpired(user)) {
    throw new Error('account_expired');
  }
}

async function waitForUserPersistence(username, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const user = await findUserByUsername(username);

    if (user) {
      return user;
    }

    await delay(150);
  }

  return null;
}

export async function ensureSeedAdmin() {
  const credentials = getSeedAdminCredentials();

  if (!credentials) {
    return null;
  }

  const existingUser = await findUserByUsername(credentials.username);

  if (existingUser) {
    const passwordMatches = await bcrypt.compare(credentials.password, existingUser.passwordHash);

    if (existingUser.role === 'admin' && passwordMatches) {
      return sanitizeUser(existingUser);
    }

    const updatedUser = {
      ...existingUser,
      username: credentials.username,
      normalizedUsername: normalizeUsername(credentials.username),
      passwordHash: await bcrypt.hash(credentials.password, 10),
      role: 'admin',
      locked: false,
      expire_date: null,
    };

    await saveUser(updatedUser);
    return sanitizeUser(updatedUser);
  }

  const user = {
    id: crypto.randomUUID(),
    username: credentials.username,
    normalizedUsername: normalizeUsername(credentials.username),
    passwordHash: await bcrypt.hash(credentials.password, 10),
    role: 'admin',
    locked: false,
    expire_date: null,
    createdAt: new Date().toISOString(),
  };

  await getStoreInstance().setJSON(getUserKey(credentials.username), user, {
    onlyIfNew: true,
  });

  return sanitizeUser(user);
}

export async function createUser({ username, password, confirmPassword }) {
  await ensureSeedAdmin();

  const trimmedUsername = String(username || '').trim();
  const normalizedUsername = normalizeUsername(trimmedUsername);

  if (!trimmedUsername || !password || !confirmPassword) {
    throw new Error('กรุณากรอกข้อมูลให้ครบ');
  }

  if (password !== confirmPassword) {
    throw new Error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
  }

  const existingUser = await findUserByUsername(trimmedUsername);

  if (existingUser) {
    throw new Error('username นี้ถูกใช้งานแล้ว');
  }

  const users = await listUsers();
  const role = users.length === 0 ? 'admin' : 'user';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    normalizedUsername,
    passwordHash,
    role,
    locked: false,
    expire_date: null,
    createdAt: new Date().toISOString(),
  };

  const result = await getStoreInstance().setJSON(getUserKey(trimmedUsername), user, {
    onlyIfNew: true,
  });

  if (result && result.modified === false) {
    throw new Error('username นี้ถูกใช้งานแล้ว');
  }

  const persistedUser = (await waitForUserPersistence(trimmedUsername)) || user;

  return sanitizeUser(persistedUser);
}

async function verifyUserCredentials({ username, password }) {
  await ensureSeedAdmin();

  const trimmedUsername = String(username || '').trim();

  if (!trimmedUsername || !password) {
    throw new Error('กรุณากรอก username และ password');
  }

  const user = await findUserByUsername(trimmedUsername);

  if (!user) {
    throw new Error('username หรือ password ไม่ถูกต้อง');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new Error('username หรือ password ไม่ถูกต้อง');
  }

  assertUserCanAccess(user);

  return user;
}

export async function authenticateUser({ username, password }) {
  const user = await verifyUserCredentials({ username, password });
  return sanitizeUser(user);
}

async function startUserSession(user) {
  const updatedUser = {
    ...user,
    currentSessionId: createSessionId(),
  };

  await saveUser(updatedUser);

  return {
    user: sanitizeUser(updatedUser),
    token: issueToken(updatedUser),
  };
}

export async function createUserSession({ username, password }) {
  const user = await verifyUserCredentials({ username, password });
  return startUserSession(user);
}

export async function createSessionForUsername(username) {
  const user = await findUserByUsername(username);

  if (!user) {
    throw new Error('user_not_found');
  }

  assertUserCanAccess(user);
  return startUserSession(user);
}

export function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      sessionId: user.currentSessionId,
    },
    getJwtSecret(),
    {
      expiresIn: '7d',
    }
  );
}

export async function getUserFromRequest(request) {
  await ensureSeedAdmin();

  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new Error('unauthorized');
  }

  const token = authorization.slice('Bearer '.length);
  const decoded = jwt.verify(token, getJwtSecret());
  const user = await findUserByUsername(decoded.username);

  if (!user) {
    throw new Error('unauthorized');
  }

  if (!decoded.sessionId || !user.currentSessionId || decoded.sessionId !== user.currentSessionId) {
    throw new Error('session_replaced');
  }

  assertUserCanAccess(user);

  return sanitizeUser(user);
}

export async function requireAdmin(request) {
  const user = await getUserFromRequest(request);

  if (user.role !== 'admin') {
    throw new Error('forbidden');
  }

  return user;
}

export async function listUsers() {
  await ensureSeedAdmin();

  const { blobs } = await getStoreInstance().list({ prefix: USER_KEY_PREFIX });
  const users = await Promise.all(
    blobs.map(({ key }) => getStoreInstance().get(key, { type: 'json' }))
  );

  return users.filter(Boolean);
}

async function findUserById(id) {
  const users = await listUsers();
  return users.find((user) => user.id === id) || null;
}

async function saveUser(user) {
  const normalizedUser = hydrateUser(user);
  await getStoreInstance().setJSON(getUserKey(normalizedUser.username), normalizedUser);
  return normalizedUser;
}

async function ensureRemainingActiveAdmin(currentUser, nextUser) {
  if (!isActiveAdmin(currentUser) || isActiveAdmin(nextUser)) {
    return;
  }

  const users = await listUsers();
  const otherActiveAdmins = users.filter((item) => item.id !== currentUser.id && isActiveAdmin(item)).length;

  if (otherActiveAdmins === 0) {
    throw new Error('last_admin');
  }
}

export async function updateUserAccess({ userId, role, locked, expire_date, actorId }) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('user_not_found');
  }

  if (role !== undefined && !AVAILABLE_ROLES.includes(role)) {
    throw new Error('invalid_role');
  }

  if (role !== undefined && user.id === actorId && role !== user.role) {
    throw new Error('cannot_change_own_role');
  }

  if (locked !== undefined && typeof locked !== 'boolean') {
    throw new Error('invalid_locked');
  }

  const normalizedExpireDate = expire_date === undefined ? user.expire_date : normalizeExpireDate(expire_date);

  if (
    user.id === actorId &&
    ((locked !== undefined && locked !== user.locked) || normalizedExpireDate !== user.expire_date)
  ) {
    throw new Error('cannot_update_own_access');
  }

  const updatedUser = {
    ...user,
    role: role ?? user.role,
    locked: locked ?? user.locked,
    expire_date: normalizedExpireDate,
  };

  await ensureRemainingActiveAdmin(user, updatedUser);
  await saveUser(updatedUser);
  return sanitizeUser(updatedUser);
}

export async function deleteUserById({ userId, actorId }) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('user_not_found');
  }

  if (user.id === actorId) {
    throw new Error('cannot_delete_self');
  }

  await ensureRemainingActiveAdmin(user, { ...user, role: 'user', locked: true, expire_date: user.expire_date });

  await getStoreInstance().delete(getUserKey(user.username));
}

export function sanitizeUsers(users) {
  return users
    .map((user) => sanitizeUser(user))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export function errorResponse(error) {
  if (error.message === 'missing_jwt_secret') {
    return jsonResponse({ error: 'Server is not configured' }, 500);
  }

  if (error.message === 'invalid_json') {
    return jsonResponse({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'unauthorized') {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (error.message === 'session_replaced') {
    return jsonResponse({ error: 'บัญชีนี้มีการเข้าสู่ระบบจากอุปกรณ์อื่นแล้ว' }, 401);
  }

  if (error.message === 'forbidden') {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (error.message === 'invalid_role') {
    return jsonResponse({ error: 'Role ไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'invalid_locked') {
    return jsonResponse({ error: 'ค่า locked ต้องเป็น true หรือ false' }, 400);
  }

  if (error.message === 'invalid_expire_date') {
    return jsonResponse({ error: 'ค่า expire_date ไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'user_not_found') {
    return jsonResponse({ error: 'ไม่พบผู้ใช้' }, 404);
  }

  if (error.message === 'cannot_change_own_role') {
    return jsonResponse({ error: 'ไม่สามารถเปลี่ยน role ของตัวเองได้' }, 400);
  }

  if (error.message === 'cannot_delete_self') {
    return jsonResponse({ error: 'ไม่สามารถลบผู้ใช้ตัวเองได้' }, 400);
  }

  if (error.message === 'cannot_update_own_access') {
    return jsonResponse({ error: 'ไม่สามารถแก้ locked หรือ expire_date ของตัวเองได้' }, 400);
  }

  if (error.message === 'account_locked') {
    return jsonResponse({ error: 'บัญชีนี้ถูกล็อก' }, 403);
  }

  if (error.message === 'account_expired') {
    return jsonResponse({ error: 'บัญชีนี้หมดอายุแล้ว' }, 403);
  }

  if (error.message === 'last_admin') {
    return jsonResponse({ error: 'ต้องมี admin อย่างน้อย 1 คน' }, 400);
  }

  return jsonResponse({ error: error.message || 'Internal server error' }, 400);
}
