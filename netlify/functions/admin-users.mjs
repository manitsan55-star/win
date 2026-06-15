import {
  adminResetPassword,
  createUserByAdmin,
  deleteUserById,
  errorResponse,
  jsonResponse,
  listUsers,
  listUsersLatest,
  readJsonBody,
  requireAdmin,
  requireAdminFast,
  sanitizeUsers,
  updateUserAccess,
} from './auth-shared.mjs';

export default async (request) => {
  try {
    if (request.method === 'GET') {
      await requireAdminFast(request);
      const url = new URL(request.url);
      const limit = url.searchParams.get('limit');
      const users = limit ? await listUsersLatest(Number(limit)) : await listUsers();
      return jsonResponse({ users: sanitizeUsers(users) });
    }

    const admin = await requireAdmin(request);

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

    if (request.method === 'PUT') {
      const body = await readJsonBody(request);
      const user = await adminResetPassword({
        userId: body.userId,
        newPassword: body.newPassword,
        actorId: admin.id,
      });

      return jsonResponse({ user });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return errorResponse(error);
  }
};
