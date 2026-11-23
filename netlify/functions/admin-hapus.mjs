// POST /api/admin/komentar/hapus - hapus satu komentar (butuh sesi valid).
import { json, fail, sameOrigin, readJson, verifySession, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/admin/komentar/hapus' };

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const body = await readJson(req, 1000);
  const id = typeof body?.id === 'string' ? body.id.slice(0, 64) : '';
  if (!id) return fail(400, 'id komentar wajib ada');

  const komentar = await getData('komentar') || [];
  const sisa = komentar.filter((k) => k?.id !== id);
  await putData('komentar', sisa);
  return json({ ok: true, tersisa: sisa.length });
};
