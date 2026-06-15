import { errorResponse, jsonResponse, requireAdminFast } from './auth-shared.mjs';
import { getPaymentSlipById, listPaymentSlips, listPaymentSlipsMeta } from './payment-slips-shared.mjs';

export default async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    await requireAdminFast(request);

    const url = new URL(request.url);
    const slipId = url.searchParams.get('id');
    const metaOnly = url.searchParams.get('meta') === '1';

    if (slipId) {
      const slip = await getPaymentSlipById(slipId);
      return jsonResponse({ slip });
    }

    if (metaOnly) {
      const slips = await listPaymentSlipsMeta();
      return jsonResponse({ slips });
    }

    const slips = await listPaymentSlips();
    return jsonResponse({ slips });
  } catch (error) {
    return errorResponse(error);
  }
};
