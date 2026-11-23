// GET /api/struktur - publik. Mengembalikan struktur kelas dari dashboard admin.
// TANPA data IP. Kalau admin belum pernah menyimpan, 404 (fallback di frontend).
import { json, fail, getData } from './_shared/lib.mjs';

export const config = { path: '/api/struktur' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  const struktur = await getData('struktur');
  if (!struktur || !struktur.length) return fail(404, 'Struktur belum diisi');
  return json({ struktur });
};
