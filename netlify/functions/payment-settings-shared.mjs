import { getStore } from '@netlify/blobs';

const STORE_NAME = 'vin-number-settings';
const PAYMENT_SETTINGS_KEY = 'payment-settings';
const DEFAULT_PAYMENT_MESSAGE = 'กรุณาโอนเงินตาม QR Code และอัปโหลดสลิปการโอนเงินด้านล่าง';
const MAX_IMAGE_DATA_LENGTH = 2_500_000;

function getStoreInstance() {
  return getStore(STORE_NAME);
}

function sanitizeImageData(value) {
  if (!value) {
    return '';
  }

  if (typeof value !== 'string' || !value.startsWith('data:image/')) {
    throw new Error('invalid_payment_image');
  }

  if (value.length > MAX_IMAGE_DATA_LENGTH) {
    throw new Error('payment_image_too_large');
  }

  return value;
}

export function sanitizePaymentSettings(settings) {
  if (!settings) {
    return {
      transferQrImage: '',
      paymentMessage: DEFAULT_PAYMENT_MESSAGE,
    };
  }

  return {
    transferQrImage: typeof settings.transferQrImage === 'string' ? settings.transferQrImage : '',
    paymentMessage:
      typeof settings.paymentMessage === 'string' && settings.paymentMessage.trim()
        ? settings.paymentMessage.trim()
        : DEFAULT_PAYMENT_MESSAGE,
  };
}

export async function getPaymentSettings() {
  const settings = await getStoreInstance().get(PAYMENT_SETTINGS_KEY, { type: 'json' });
  return sanitizePaymentSettings(settings);
}

export async function savePaymentSettings({ transferQrImage, paymentMessage }) {
  const nextSettings = {
    transferQrImage: sanitizeImageData(transferQrImage),
    paymentMessage:
      typeof paymentMessage === 'string' && paymentMessage.trim()
        ? paymentMessage.trim()
        : DEFAULT_PAYMENT_MESSAGE,
  };

  await getStoreInstance().setJSON(PAYMENT_SETTINGS_KEY, nextSettings);
  return sanitizePaymentSettings(nextSettings);
}
