// POST /api/admin/galeri - upload beberapa foto galeri sekaligus (butuh sesi valid).
// Multipart/form-data: satu atau lebih field "file" (JPG/PNG/WebP).
// Klien mengompres dulu (sisi terpanjang 1600px, kualitas ~0.8). Server tetap
// memvalidasi ulang tipe dan ukuran. Maks 12 file per request, 6 MB per file,
// 200 foto per galeri.
import crypto from 'node:crypto';
import { json, fail, sameOrigin, verifySession, store, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/admin/galeri' };

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_FILES = 12;
const MAX_PHOTOS = 200;
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
  const files = [...form.getAll('file')].filter((f) => f && typeof f !== 'string');
  if (!files.length) return fail(400, 'Minimal satu foto');
  if (files.length > MAX_FILES) return fail(400, `Maksimal ${MAX_FILES} foto per unggahan`);

  const tersimpan = await getData('galeri') || [];
  if (tersimpan.length + files.length > MAX_PHOTOS) {
    return fail(400, `Galeri penuh (maks ${MAX_PHOTOS} foto). Hapus dulu yang lama.`);
  }

  const ids = [];
  for (const file of files) {
    if (!OK_TYPES.includes(file.type)) {
      return fail(400, 'Semua file harus JPG, PNG, atau WebP');
    }
    if (file.size > MAX_BYTES) {
      return fail(400, 'Ukuran satu foto melebihi 6 MB');
    }
  }
  for (const file of files) {
    const id = Date.now() + '-' + crypto.randomUUID().slice(0, 8);
    const buf = await file.arrayBuffer();
    await store().set(`galeri:${id}`, buf, { type: file.type });
    ids.push(id);
  }

  tersimpan.unshift(...ids);
  await putData('galeri', tersimpan.slice(0, MAX_PHOTOS));
  return json({ ok: true, ids });
};
