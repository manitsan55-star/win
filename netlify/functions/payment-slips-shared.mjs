import { getStore } from '@netlify/blobs';

const STORE_NAME = 'vin-number-settings';
const PAYMENT_SLIP_KEY_PREFIX = 'payment-slip:';
const PAYMENT_SLIP_INDEX_KEY = 'payment-slip-index';
const MAX_IMAGE_DATA_LENGTH = 2_500_000;

function getStoreInstance() {
  return getStore(STORE_NAME);
}

function getSlipKey(id) {
  return `${PAYMENT_SLIP_KEY_PREFIX}${id}`;
}

function sanitizeSlipImage(value) {
  if (!value) {
    throw new Error('invalid_payment_image');
  }

  if (typeof value !== 'string' || !value.startsWith('data:image/')) {
    throw new Error('invalid_payment_image');
  }

  if (value.length > MAX_IMAGE_DATA_LENGTH) {
    throw new Error('payment_image_too_large');
  }

  return value;
}

function getSlipType(user) {
  if (user?.new_user) {
    return 'signup';
  }
  return 'renewal';
}

function sanitizeSlipRecord(slip) {
  if (!slip) {
    return null;
  }

  return {
    id: String(slip.id || ''),
    userId: typeof slip.userId === 'string' ? slip.userId : '',
    username: typeof slip.username === 'string' ? slip.username : '',
    imageData: typeof slip.imageData === 'string' ? slip.imageData : '',
    type: typeof slip.type === 'string' ? slip.type : 'signup',
    createdAt: typeof slip.createdAt === 'string' ? slip.createdAt : new Date().toISOString(),
  };
}

async function getSlipIndex() {
  const ids = await getStoreInstance().get(PAYMENT_SLIP_INDEX_KEY, { type: 'json' });

  if (!Array.isArray(ids)) {
    return [];
  }

  return [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
}

async function saveSlipIndex(ids) {
  const normalized = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  await getStoreInstance().setJSON(PAYMENT_SLIP_INDEX_KEY, normalized);
  return normalized;
}

export async function createPaymentSlip({ user, imageData }) {
  if (!user?.id || !user?.username) {
    throw new Error('unauthorized');
  }

  const slip = sanitizeSlipRecord({
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    imageData: sanitizeSlipImage(imageData),
    type: getSlipType(user),
    createdAt: new Date().toISOString(),
  });

  await getStoreInstance().setJSON(getSlipKey(slip.id), slip);
  const currentIndex = await getSlipIndex();
  await saveSlipIndex([slip.id, ...currentIndex]);

  return slip;
}

export async function listPaymentSlips() {
  const indexedIds = await getSlipIndex();

  if (indexedIds.length > 0) {
    const slips = await Promise.all(indexedIds.map((id) => getStoreInstance().get(getSlipKey(id), { type: 'json' })));
    return slips
      .map((slip) => sanitizeSlipRecord(slip))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const { blobs } = await getStoreInstance().list({ prefix: PAYMENT_SLIP_KEY_PREFIX });
  const slips = await Promise.all(blobs.map(({ key }) => getStoreInstance().get(key, { type: 'json' })));
  const sanitizedSlips = slips
    .map((slip) => sanitizeSlipRecord(slip))
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sanitizedSlips.length > 0) {
    await saveSlipIndex(sanitizedSlips.map((slip) => slip.id));
  }

  return sanitizedSlips;
}

function sanitizeSlipMeta(slip) {
  if (!slip) {
    return null;
  }
  return {
    id: String(slip.id || ''),
    userId: typeof slip.userId === 'string' ? slip.userId : '',
    username: typeof slip.username === 'string' ? slip.username : '',
    type: typeof slip.type === 'string' ? slip.type : 'signup',
    createdAt: typeof slip.createdAt === 'string' ? slip.createdAt : new Date().toISOString(),
  };
}

export async function listPaymentSlipsMeta() {
  const indexedIds = await getSlipIndex();

  if (indexedIds.length > 0) {
    const slips = await Promise.all(indexedIds.map((id) => getStoreInstance().get(getSlipKey(id), { type: 'json' })));
    return slips
      .map((slip) => sanitizeSlipMeta(slip))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const { blobs } = await getStoreInstance().list({ prefix: PAYMENT_SLIP_KEY_PREFIX });
  const slips = await Promise.all(blobs.map(({ key }) => getStoreInstance().get(key, { type: 'json' })));
  const sanitizedSlips = slips
    .map((slip) => sanitizeSlipMeta(slip))
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sanitizedSlips.length > 0) {
    await saveSlipIndex(sanitizedSlips.map((slip) => slip.id));
  }

  return sanitizedSlips;
}

export async function getPaymentSlipById(id) {
  const slip = await getStoreInstance().get(getSlipKey(id), { type: 'json' });
  return sanitizeSlipRecord(slip);
}
