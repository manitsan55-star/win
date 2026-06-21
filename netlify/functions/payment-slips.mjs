import { errorResponse, getUserFromRequest, jsonResponse, readJsonBody } from './auth-shared.mjs';
import { createPaymentSlip } from './payment-slips-shared.mjs';

async function notifyNewSlip(slip) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  console.log('[OneSignal Notify] appId present?', !!appId, 'apiKey present?', !!apiKey);
  if (!appId || !apiKey) {
    console.log('[OneSignal Notify] Skipping: missing env vars');
    return;
  }

  const payload = {
    app_id: appId,
    filters: [
      { field: 'tag', key: 'role', relation: '=', value: 'admin' }
    ],
    headings: { en: 'สลิปใหม่', th: 'สลิปใหม่' },
    contents: {
      en: `${slip.username} uploaded a ${slip.type === 'signup' ? 'signup' : 'renewal'} slip`,
      th: `${slip.username} อัปโหลดสลิป${slip.type === 'signup' ? 'สมัครใหม่' : 'ต่ออายุ'}`,
    },
  };
  console.log('[OneSignal Notify] Sending payload:', JSON.stringify(payload));

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    console.log('[OneSignal Notify] Response status:', response.status, 'body:', JSON.stringify(data));
  } catch (e) {
    console.error('[OneSignal Notify] Failed:', e);
  }
}

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await getUserFromRequest(request);
    const body = await readJsonBody(request);
    const slip = await createPaymentSlip({
      user,
      imageData: body.imageData,
    });

    notifyNewSlip(slip);

    return jsonResponse({ slip }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
