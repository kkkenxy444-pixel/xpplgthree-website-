// POST /api/admin/galeri/hapus - buang satu foto galeri (butuh sesi valid).
// Body JSON: {"id": "<id-foto>"}. Blob dihapus dan daftar galeri diperbarui.
import { json, fail, sameOrigin, readJson, verifySession, store, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/admin/galeri/hapus' };

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const body = await readJson(req, 1000);
  const id = typeof body?.id === 'string' ? body.id.slice(0, 64) : '';
  if (!id || !/^[0-9]{13}-[0-9a-f]{8}$/.test(id)) return fail(400, 'id foto tidak valid');

  try { await store().delete(`galeri:${id}`); } catch { /* blob mungkin sudah tidak ada */ }

  const tersimpan = (await getData('galeri') || []).filter((v) => v !== id);
  await putData('galeri', tersimpan);
  return json({ ok: true, tersisa: tersimpan.length });
};
