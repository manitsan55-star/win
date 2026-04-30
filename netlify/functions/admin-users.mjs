import {
  deleteUserById,
  errorResponse,
  jsonResponse,
  listUsers,
  readJsonBody,
  requireAdmin,
  sanitizeUsers,
  updateUserRole,
} from './auth-shared.mjs';

export default async (request) => {
  try {
    const admin = await requireAdmin(request);

    if (request.method === 'GET') {
      const users = await listUsers();
      return jsonResponse({ users: sanitizeUsers(users) });
    }

    if (request.method === 'PATCH') {
      const body = await readJsonBody(request);
      const user = await updateUserRole({
        userId: body.userId,
        role: body.role,
        actorId: admin.id,
      });

      return jsonResponse({ user });
    }

    if (request.method === 'DELETE') {
      const body = await readJsonBody(request);
      await deleteUserById({
        userId: body.userId,
        actorId: admin.id,
      });

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};
