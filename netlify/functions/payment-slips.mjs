import { errorResponse, getUserFromRequest, jsonResponse, readJsonBody } from './auth-shared.mjs';
import { createPaymentSlip } from './payment-slips-shared.mjs';
import Tesseract from 'tesseract.js';

async function processOCR(imageData) {
  try {
    const { data } = await Tesseract.recognize(imageData, 'eng+tha', {
      logger: () => {},
    });

    const rawText = data.text || '';
    const confidence = data.confidence || 0;

    let ocrAmount = '';
    let ocrTime = '';

    const amountMatch = rawText.match(/(\d+[.,]?\d*)\s*(บาท|THB|฿)?/i);
    if (amountMatch) {
      ocrAmount = amountMatch[1].replace(/,/g, '');
    }

    const timeMatch = rawText.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      ocrTime = timeMatch[1];
    }

    return {
      ocrAmount,
      ocrTime,
      ocrConfidence: confidence,
      ocrRawText: rawText,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      ocrAmount: '',
      ocrTime: '',
      ocrConfidence: 0,
      ocrRawText: '',
    };
  }
}

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await getUserFromRequest(request);
    const body = await readJsonBody(request);
    const ocrResult = await processOCR(body.imageData);
    const slip = await createPaymentSlip({
      user,
      imageData: body.imageData,
      ...ocrResult,
    });

    return jsonResponse({ slip }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
