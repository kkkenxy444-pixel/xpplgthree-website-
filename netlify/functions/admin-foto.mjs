// POST /api/admin/foto - upload foto satu murid (butuh sesi valid).
// Kirim multipart/form-data: idx (0-33) dan file (JPG/PNG/WebP, maks 4 MB).
// Foto disimpan di Blobs, lalu field foto murid diarahkan ke /api/foto/<idx>.
import { json, fail, sameOrigin, verifySession, store, getData, putData, DEFAULT_MURID } from './_shared/lib.mjs';

export const config = { path: '/api/admin/foto' };

const MAX_BYTES = 4 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'Form tidak valid');
  }
  const idx = Number(form.get('idx'));
  if (!Number.isInteger(idx) || idx < 0 || idx > 33) return fail(400, 'Nomor murid tidak valid');

  const file = form.get('file');
  if (!file || typeof file === 'string') return fail(400, 'File foto wajib ada');
  if (!OK_TYPES.includes(file.type)) return fail(400, 'Format harus JPG, PNG, atau WebP');
  if (file.size > MAX_BYTES) return fail(400, 'Ukuran foto maksimal 4 MB');

  const buf = await file.arrayBuffer();
  await store().set(`foto:${idx}`, buf, { type: file.type });

  // Tandai di data murid bahwa baris ini punya foto.
  const murid = await getData('murid') || DEFAULT_MURID;
  if (murid[idx]) {
    murid[idx].foto = `/api/foto/${idx}`;
    await putData('murid', murid);
  }

  return json({ ok: true, url: `/api/foto/${idx}` });
};
