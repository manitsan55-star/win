import { createSessionForUser, createUser, errorResponse, jsonResponse, readJsonBody } from './auth-shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const user = await createUser(body);
    const session = await createSessionForUser(user);

    return jsonResponse(session, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
