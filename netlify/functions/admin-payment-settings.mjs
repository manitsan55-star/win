import { errorResponse, jsonResponse, readJsonBody, requireAdmin } from './auth-shared.mjs';
import { getPaymentSettings, savePaymentSettings } from './payment-settings-shared.mjs';

export default async (request) => {
  try {
    await requireAdmin(request);

    if (request.method === 'GET') {
      const settings = await getPaymentSettings();
      return jsonResponse({ settings });
    }

    if (request.method === 'PUT') {
      const body = await readJsonBody(request);
      const settings = await savePaymentSettings({
        lineQrImage: body.lineQrImage,
        transferQrImage: body.transferQrImage,
        paymentMessage: body.paymentMessage,
      });

      return jsonResponse({ settings });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};
