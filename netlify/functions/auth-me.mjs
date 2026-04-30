import { errorResponse, getUserFromRequest, jsonResponse } from './auth-shared.mjs';

export default async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await getUserFromRequest(request);
    return jsonResponse({ user });
  } catch (error) {
    return errorResponse(error);
  }
};
