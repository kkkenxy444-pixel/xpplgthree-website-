// GET /api/galeri - publik. Daftar foto galeri kelas (urutan terbaru dulu).
// Format: { photo: [{ id, url }] }. Hanya id dan URL, tanpa data IP.
import { json, fail, getData } from './_shared/lib.mjs';

export const config = { path: '/api/galeri' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  const ids = await getData('galeri');
  if (!ids) return fail(404, 'Galeri belum diisi');
  return json({
    photo: ids.map((id) => ({ id, url: `/api/galeri-foto/${id}` })),
  });
};
