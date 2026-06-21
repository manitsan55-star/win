import { errorResponse, getUserFromRequest, jsonResponse, readJsonBody } from './auth-shared.mjs';
import { createPaymentSlip } from './payment-slips-shared.mjs';

async function notifyNewSlip(slip) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return;
  }

  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'admin' }
        ],
        headings: { en: 'สลิปใหม่', th: 'สลิปใหม่' },
        contents: {
          en: `${slip.username} uploaded a ${slip.type === 'signup' ? 'signup' : 'renewal'} slip`,
          th: `${slip.username} อัปโหลดสลิป${slip.type === 'signup' ? 'สมัครใหม่' : 'ต่ออายุ'}`,
        },
      }),
    });
  } catch (e) {
    console.error('OneSignal notify failed:', e);
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
