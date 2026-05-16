import { errorResponse, jsonResponse, requireAdmin } from './auth-shared.mjs';
import { listPaymentSlips } from './payment-slips-shared.mjs';

export default async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    await requireAdmin(request);
    const slips = await listPaymentSlips();
    return jsonResponse({ slips });
  } catch (error) {
    return errorResponse(error);
  }
};
