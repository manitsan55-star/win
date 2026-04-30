import { getAuthToken } from '@/utils/auth';

const PAYMENT_API_BASE = '/api/payment-settings';
const ADMIN_PAYMENT_API_BASE = '/api/admin/payment-settings';

async function readJsonResponse(response) {
  return response.json().catch(() => ({}));
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
  const response = await fetch(ADMIN_PAYMENT_API_BASE, {
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

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}
