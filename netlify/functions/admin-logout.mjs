// POST /api/admin/logout - hapus cookie sesi.
import { json, fail, clearedCookie } from './_shared/lib.mjs';

export const config = { path: '/api/admin/logout' };

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  return json({ ok: true }, 200, { 'set-cookie': clearedCookie() });
};
