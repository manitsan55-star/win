import { errorResponse, getUserFromRequest, jsonResponse, readJsonBody } from './auth-shared.mjs';
import { createPaymentSlip } from './payment-slips-shared.mjs';

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

    return jsonResponse({ slip }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
