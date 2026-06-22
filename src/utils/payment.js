import { getAuthToken } from '@/utils/auth';

const PAYMENT_API_BASE = '/api/payment-settings';
const PAYMENT_SLIPS_API_BASE = '/api/payment-slips';
const ADMIN_PAYMENT_API_BASE = '/api/admin/payment-settings';
const ADMIN_PAYMENT_SLIPS_API_BASE = '/api/admin/payment-slips';

async function readJsonResponse(response) {
  return response.json().catch(() => ({}));
}

async function fetchWithRetry(url, options = {}, attempt = 0) {
  try {
    const response = await fetch(url, options);
    // Retry server errors (502/503/504 cold-start), but not auth/client errors.
    if (response.status >= 500 && attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return fetchWithRetry(url, options, attempt + 1);
    }
    return response;
  } catch (networkError) {
    // Transient network failure (often a cold-start). Retry once.
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw networkError;
  }
}

export async function fetchPaymentSettings() {
  const response = await fetch(PAYMENT_API_BASE);
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลการชำระเงินได้');
  }

  return data.settings;
}

export async function fetchAdminPaymentSettings() {
  const token = getAuthToken();
  const response = await fetchWithRetry(ADMIN_PAYMENT_API_BASE, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลการชำระเงินได้');
  }

  return data.settings;
}

export async function updateAdminPaymentSettings(settings) {
  const token = getAuthToken();
  const response = await fetch(ADMIN_PAYMENT_API_BASE, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify(settings),
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลการชำระเงินได้');
  }

  return data.settings;
}

export async function uploadPaymentSlip(imageData) {
  const token = getAuthToken();
  const response = await fetch(PAYMENT_SLIPS_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify({ imageData }),
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถอัปโหลดสลิปได้');
  }

  return data.slip;
}

export async function fetchAdminPaymentSlips() {
  const token = getAuthToken();
  const response = await fetch(ADMIN_PAYMENT_SLIPS_API_BASE, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดสลิปการโอนเงินได้');
  }

  return data.slips || [];
}

export async function fetchAdminPaymentSlipsMeta() {
  const token = getAuthToken();
  const response = await fetchWithRetry(`${ADMIN_PAYMENT_SLIPS_API_BASE}?meta=1`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดสลิปการโอนเงินได้');
  }

  return data.slips || [];
}

export async function fetchAdminPaymentSlipById(slipId) {
  const token = getAuthToken();
  const response = await fetchWithRetry(`${ADMIN_PAYMENT_SLIPS_API_BASE}?id=${encodeURIComponent(slipId)}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || 'ไม่สามารถโหลดสลิปได้');
  }

  return data.slip;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}
