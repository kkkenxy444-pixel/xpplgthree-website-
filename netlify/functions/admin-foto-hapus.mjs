// POST /api/admin/foto/hapus - buang foto satu murid (butuh sesi valid).
// Body JSON: {"idx": 0..33}. Blob dihapus dan field foto murid dikosongkan.
import { json, fail, sameOrigin, readJson, verifySession, store, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/admin/foto/hapus' };

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const body = await readJson(req, 1000);
  const idx = Number(body?.idx);
  if (!Number.isInteger(idx) || idx < 0 || idx > 33) return fail(400, 'Nomor murid tidak valid');

  try { await store().delete(`foto:${idx}`); } catch { /* blob mungkin belum ada */ }

  const murid = await getData('murid');
  if (murid && murid[idx]) {
    murid[idx].foto = '';
    await putData('murid', murid);
  }
  return json({ ok: true });
};
