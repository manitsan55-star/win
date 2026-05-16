import { changePassword, errorResponse, getUserFromRequest, jsonResponse } from './auth-shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();

    if (!body.currentPassword || !body.newPassword) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const updatedUser = await changePassword({
      userId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    return jsonResponse({ user: updatedUser });
  } catch (error) {
    return errorResponse(error);
  }
};
