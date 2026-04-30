import { authenticateUser, errorResponse, issueToken, jsonResponse, readJsonBody } from './auth-shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const user = await authenticateUser(body);
    const token = issueToken(user);

    return jsonResponse({ user, token });
  } catch (error) {
    return errorResponse(error);
  }
};
