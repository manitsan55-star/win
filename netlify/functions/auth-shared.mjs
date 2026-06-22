import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const STORE_NAME = 'vin-number-auth';
const USER_KEY_PREFIX = 'user:';
const USER_INDEX_KEY = 'user-index';
const AVAILABLE_ROLES = ['admin', 'vip', 'user'];

let _usersCache = null;
let _usersCacheTime = 0;
const USERS_CACHE_TTL = 300000;

let _seedAdminVerified = false;

function getStoreInstance() {
  return getStore(STORE_NAME);
}

function invalidateUsersCache() {
  _usersCache = null;
  _usersCacheTime = 0;
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

async function getUserIndex() {
  const usernames = await getStoreInstance().get(USER_INDEX_KEY, { type: 'json' });

  if (!Array.isArray(usernames)) {
    return [];
  }

  return [...new Set(usernames.map((username) => normalizeUsername(username)).filter(Boolean))];
}

async function saveUserIndex(usernames) {
  const normalized = [...new Set(usernames.map((username) => normalizeUsername(username)).filter(Boolean))].sort();
  await getStoreInstance().setJSON(USER_INDEX_KEY, normalized);
  return normalized;
}

async function addUsernameToIndex(username) {
  const normalizedUsername = normalizeUsername(username);
  const currentIndex = await getUserIndex();

  if (currentIndex.includes(normalizedUsername)) {
    return currentIndex;
  }

  return saveUserIndex([...currentIndex, normalizedUsername]);
}

async function removeUsernameFromIndex(username) {
  const normalizedUsername = normalizeUsername(username);
  const currentIndex = await getUserIndex();
  return saveUserIndex(currentIndex.filter((item) => item !== normalizedUsername));
}

function isValidDateOnlyString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toDateOnlyString(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function normalizeExpireDate(expireDate) {
  if (expireDate === null || expireDate === undefined || expireDate === '') {
    return null;
  }

  const value = String(expireDate).trim();

  if (isValidDateOnlyString(value)) {
    return value;
  }

  const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dateOnlyMatch && isValidDateOnlyString(dateOnlyMatch[1])) {
    return dateOnlyMatch[1];
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('invalid_expire_date');
  }

  return toDateOnlyString(parsedDate);
}

function hydrateUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: AVAILABLE_ROLES.includes(user.role) ? user.role : 'user',
    locked: Boolean(user.locked),
    new_user: Boolean(user.new_user),
    expire_date: normalizeExpireDate(user.expire_date),
    currentSessionId: typeof user.currentSessionId === 'string' ? user.currentSessionId : null,
  };
}

function isUserExpired(user) {
  if (!user?.expire_date) {
    return false;
  }

  return user.expire_date < toDateOnlyString(new Date());
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
    new_user: Boolean(user.new_user),
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

async function waitForTokenSessionUser(username, sessionId, tokenIssuedMs = 0, attempts = 20) {
  let latestUser = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const user = await findUserByUsername(username);

    if (user?.currentSessionId === sessionId) {
      return user;
    }

    // Stored session is clearly newer than this token => session was replaced.
    // Stop waiting so the old device is logged out promptly.
    if (
      user &&
      user.sessionCreatedAt &&
      tokenIssuedMs &&
      user.sessionCreatedAt > tokenIssuedMs + 1000
    ) {
      return user;
    }

    latestUser = user || latestUser;
    await delay(200);
  }

  return latestUser;
}

export async function ensureSeedAdmin() {
  if (_seedAdminVerified) {
    return null;
  }

  const credentials = getSeedAdminCredentials();

  if (!credentials) {
    return null;
  }

  const existingUser = await findUserByUsername(credentials.username);

  if (existingUser) {
    const passwordMatches = await bcrypt.compare(credentials.password, existingUser.passwordHash);

    if (existingUser.role === 'admin' && passwordMatches) {
      _seedAdminVerified = true;
      return sanitizeUser(existingUser);
    }

    const updatedUser = {
      ...existingUser,
      username: credentials.username,
      normalizedUsername: normalizeUsername(credentials.username),
      passwordHash: await bcrypt.hash(credentials.password, 10),
      role: 'admin',
      locked: false,
      new_user: false,
      expire_date: null,
    };

    await saveUser(updatedUser);
    _seedAdminVerified = true;
    return sanitizeUser(updatedUser);
  }

  const user = {
    id: crypto.randomUUID(),
    username: credentials.username,
    normalizedUsername: normalizeUsername(credentials.username),
    passwordHash: await bcrypt.hash(credentials.password, 10),
    role: 'admin',
    locked: false,
    new_user: false,
    expire_date: null,
    createdAt: new Date().toISOString(),
  };

  await getStoreInstance().setJSON(getUserKey(credentials.username), user, {
    onlyIfNew: true,
  });

  await addUsernameToIndex(credentials.username);

  _seedAdminVerified = true;
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

  const indexedUsers = await getUserIndex();
  const role = indexedUsers.length === 0 ? 'admin' : 'user';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    normalizedUsername,
    passwordHash,
    role,
    locked: false,
    new_user: true,
    expire_date: null,
    createdAt: new Date().toISOString(),
  };

  const result = await getStoreInstance().setJSON(getUserKey(trimmedUsername), user, {
    onlyIfNew: true,
  });

  if (result && result.modified === false) {
    throw new Error('username นี้ถูกใช้งานแล้ว');
  }

  await addUsernameToIndex(trimmedUsername);

  return user;
}

export async function createUserByAdmin({ username, password, role, locked, new_user, expire_date }) {
  await ensureSeedAdmin();

  const trimmedUsername = String(username || '').trim();
  const normalizedUsername = normalizeUsername(trimmedUsername);

  if (!trimmedUsername || !password) {
    throw new Error('กรุณากรอกข้อมูลให้ครบ');
  }

  if (role !== undefined && !AVAILABLE_ROLES.includes(role)) {
    throw new Error('invalid_role');
  }

  if (locked !== undefined && typeof locked !== 'boolean') {
    throw new Error('invalid_locked');
  }

  if (new_user !== undefined && typeof new_user !== 'boolean') {
    throw new Error('invalid_new_user');
  }

  const existingUser = await findUserByUsername(trimmedUsername);

  if (existingUser) {
    throw new Error('username นี้ถูกใช้งานแล้ว');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    normalizedUsername,
    passwordHash,
    role: role || 'user',
    locked: locked ?? false,
    new_user: new_user ?? true,
    expire_date: normalizeExpireDate(expire_date),
    createdAt: new Date().toISOString(),
    currentSessionId: null,
  };

  const result = await getStoreInstance().setJSON(getUserKey(trimmedUsername), user, {
    onlyIfNew: true,
  });

  if (result && result.modified === false) {
    throw new Error('username นี้ถูกใช้งานแล้ว');
  }

  await addUsernameToIndex(trimmedUsername);

  return sanitizeUser(user);
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

  return user;
}

export async function authenticateUser({ username, password }) {
  const user = await verifyUserCredentials({ username, password });
  return sanitizeUser(user);
}

async function startUserSession(user) {
  const isAdmin = user.role === 'admin';

  const updatedUser = isAdmin
    ? user
    : {
        ...user,
        currentSessionId: createSessionId(),
        sessionCreatedAt: Date.now(),
      };

  if (!isAdmin) {
    await saveUser(updatedUser);
  }

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

export async function createSessionForUser(user) {
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
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw new Error('unauthorized');
  }

  const tokenIssuedMs = (decoded.iat || 0) * 1000;

  // Admins don't use single-session tracking, so skip the session wait loop
  // entirely to avoid a multi-second delay on every admin request.
  const initialUser = await findUserByUsername(decoded.username);

  if (initialUser?.role === 'admin') {
    return sanitizeUser(initialUser);
  }

  const user = await waitForTokenSessionUser(decoded.username, decoded.sessionId, tokenIssuedMs);

  if (!user) {
    console.log('[Auth] User not found:', decoded.username);
    throw new Error('unauthorized');
  }

  if (user.role === 'admin') {
    return sanitizeUser(user);
  }

  if (!decoded.sessionId) {
    console.log('[Auth] Token missing sessionId for user:', decoded.username);
    throw new Error('unauthorized');
  }

  if (!user.currentSessionId) {
    const createdAt = new Date(user.createdAt || 0).getTime();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (createdAt > fiveMinutesAgo) {
      console.log('[Auth] New user grace period, allowing:', decoded.username);
      return sanitizeUser(user);
    }
    console.log('[Auth] Missing currentSessionId for user:', decoded.username);
    throw new Error('unauthorized');
  }

  if (decoded.sessionId !== user.currentSessionId) {
    const sessionCreatedAt = user.sessionCreatedAt || 0;
    // If this token was issued at-or-after the stored session, the stored copy
    // is just lagging behind (eventual consistency) for THIS device. Allow it.
    if (sessionCreatedAt && tokenIssuedMs + 1000 >= sessionCreatedAt) {
      console.log('[Auth] Session propagation lag, allowing:', decoded.username);
      return sanitizeUser(user);
    }
    console.log('[Auth] Session replaced for user:', decoded.username);
    throw new Error('session_replaced');
  }

  return sanitizeUser(user);
}

export async function requireAdmin(request) {
  const user = await getUserFromRequest(request);

  if (user.role !== 'admin') {
    throw new Error('forbidden');
  }

  return user;
}

export async function requireAdminFast(request) {
  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new Error('unauthorized');
  }

  const token = authorization.slice('Bearer '.length);
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw new Error('unauthorized');
  }

  const user = await findUserByUsername(decoded.username);

  if (!user) {
    throw new Error('unauthorized');
  }

  if (user.role !== 'admin') {
    throw new Error('forbidden');
  }

  return sanitizeUser(user);
}

export async function listUsers() {
  await ensureSeedAdmin();

  const now = Date.now();
  if (_usersCache && (now - _usersCacheTime) < USERS_CACHE_TTL) {
    return _usersCache;
  }

  const indexedUsernames = await getUserIndex();

  let hydratedUsers;
  if (indexedUsernames.length > 0) {
    const batchSize = 100;
    const allUsers = [];
    for (let i = 0; i < indexedUsernames.length; i += batchSize) {
      const batch = indexedUsernames.slice(i, i + batchSize);
      const batchUsers = await Promise.all(
        batch.map((username) => getStoreInstance().get(getUserKey(username), { type: 'json' }))
      );
      allUsers.push(...batchUsers);
    }
    hydratedUsers = allUsers.filter(Boolean);
  } else {
    const { blobs } = await getStoreInstance().list({ prefix: USER_KEY_PREFIX });
    const batchSize = 100;
    const allUsers = [];
    for (let i = 0; i < blobs.length; i += batchSize) {
      const batch = blobs.slice(i, i + batchSize);
      const batchUsers = await Promise.all(
        batch.map(({ key }) => getStoreInstance().get(key, { type: 'json' }))
      );
      allUsers.push(...batchUsers);
    }
    hydratedUsers = allUsers.filter(Boolean);

    if (hydratedUsers.length > 0) {
      await saveUserIndex(hydratedUsers.map((user) => user.username));
    }
  }

  _usersCache = hydratedUsers;
  _usersCacheTime = now;
  return hydratedUsers;
}

export async function listUsersLatest(limit = 20) {
  const allUsers = await listUsers();
  const sorted = sanitizeUsers(allUsers);
  return sorted.slice(0, limit);
}

async function findUserById(id) {
  const users = await listUsers();
  return users.find((user) => user.id === id) || null;
}

async function saveUser(user) {
  const normalizedUser = hydrateUser(user);
  await getStoreInstance().setJSON(getUserKey(normalizedUser.username), normalizedUser);
  await addUsernameToIndex(normalizedUser.username);
  invalidateUsersCache();
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

export async function updateUserAccess({ userId, role, locked, new_user, expire_date, actorId }) {
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

  if (new_user !== undefined && typeof new_user !== 'boolean') {
    throw new Error('invalid_new_user');
  }

  const normalizedExpireDate = expire_date === undefined ? user.expire_date : normalizeExpireDate(expire_date);

  if (
    user.id === actorId &&
    ((locked !== undefined && locked !== user.locked) || normalizedExpireDate !== user.expire_date)
  ) {
    throw new Error('cannot_update_own_access');
  }

  const isSettingExpireDate = expire_date !== undefined;
  const hasValidExpireDate = normalizedExpireDate !== null;

  const updatedUser = {
    ...user,
    role: role ?? user.role,
    locked: locked ?? user.locked,
    new_user: new_user !== undefined ? new_user : (isSettingExpireDate && hasValidExpireDate ? false : user.new_user),
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
  await removeUsernameFromIndex(user.username);
  invalidateUsersCache();
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('user_not_found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new Error('invalid_password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = {
    ...user,
    password: hashedPassword,
  };

  await saveUser(updatedUser);
  return sanitizeUser(updatedUser);
}

export async function adminResetPassword({ userId, newPassword, actorId }) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('user_not_found');
  }

  if (user.id === actorId) {
    throw new Error('cannot_reset_own_password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = {
    ...user,
    password: hashedPassword,
  };

  await saveUser(updatedUser);
  return sanitizeUser(updatedUser);
}

export function sanitizeUsers(users) {
  return users
    .map((user) => sanitizeUser(user))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
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

  if (error.message === 'invalid_new_user') {
    return jsonResponse({ error: 'ค่า new_user ต้องเป็น true หรือ false' }, 400);
  }

  if (error.message === 'invalid_expire_date') {
    return jsonResponse({ error: 'ค่า expire_date ไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'invalid_payment_image') {
    return jsonResponse({ error: 'รูปภาพ QR Code ไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'payment_image_too_large') {
    return jsonResponse({ error: 'ไฟล์รูป QR Code มีขนาดใหญ่เกินไป' }, 400);
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

  if (error.message === 'invalid_password') {
    return jsonResponse({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, 400);
  }

  if (error.message === 'cannot_reset_own_password') {
    return jsonResponse({ error: 'ไม่สามารถรีเซ็ตรหัสผ่านของตัวเองได้' }, 400);
  }

  return jsonResponse({ error: error.message || 'Internal server error' }, 400);
}
