// GET /api/foto/<nomor> - publik. Menyajikan foto murid dari Netlify Blobs.
// Nomor: 0 sampai 33 (urutan murid). Cache 1 jam di browser.
import { fail, store } from './_shared/lib.mjs';

export const config = { path: '/api/foto/:nomor' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  const m = new URL(req.url).pathname.match(/\/api\/foto\/(\d+)\/?$/);
  if (!m) return fail(404, 'Foto tidak ada');
  const idx = Number(m[1]);
  if (idx < 0 || idx > 33) return fail(404, 'Foto tidak ada');

  const blob = await store().getWithMetadata(`foto:${idx}`, { type: 'arrayBuffer' });
  if (!blob || !blob.data) return fail(404, 'Foto tidak ada');

  return new Response(blob.data, {
    headers: {
      'content-type': blob.mimeType || 'image/jpeg',
      'cache-control': 'public, max-age=3600',
    },
  });
};
