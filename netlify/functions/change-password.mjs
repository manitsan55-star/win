import { errorResponse, getUserFromRequest, jsonResponse, readJsonBody } from './auth-shared.mjs';
import { changePassword } from './auth-shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const user = await getUserFromRequest(request);
    const body = await readJsonBody(request);
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
