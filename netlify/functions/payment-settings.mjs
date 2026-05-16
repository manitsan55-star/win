import { errorResponse, jsonResponse } from './auth-shared.mjs';
import { getPaymentSettings } from './payment-settings-shared.mjs';

export default async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const settings = await getPaymentSettings();
    return jsonResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
};
