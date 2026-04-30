import {
  createUserByAdmin,
  deleteUserById,
  errorResponse,
  jsonResponse,
  listUsers,
  readJsonBody,
  requireAdmin,
  sanitizeUsers,
  updateUserAccess,
} from './auth-shared.mjs';

export default async (request) => {
  try {
    const admin = await requireAdmin(request);

    if (request.method === 'GET') {
      const users = await listUsers();
      return jsonResponse({ users: sanitizeUsers(users) });
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      const user = await createUserByAdmin({
        username: body.username,
        password: body.password,
        role: body.role,
        locked: body.locked,
        new_user: body.new_user,
        expire_date: body.expire_date,
      });

      return jsonResponse({ user }, 201);
    }

    if (request.method === 'PATCH') {
      const body = await readJsonBody(request);
      const user = await updateUserAccess({
        userId: body.userId,
        role: body.role,
        locked: body.locked,
        new_user: body.new_user,
        expire_date: body.expire_date,
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
