// GET /api/siswa - publik. Mengembalikan daftar murid dari dashboard admin.
// TANPA data IP. Kalau admin belum pernah menyimpan, 404 (fallback di frontend).
import { json, fail, getData } from './_shared/lib.mjs';

export const config = { path: '/api/siswa' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  const murid = await getData('murid');
  if (!murid || !murid.length) return fail(404, 'Data murid belum diisi');
  return json({ anggota: murid });
};
