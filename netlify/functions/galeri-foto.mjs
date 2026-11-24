// GET /api/galeri-foto/<id> - publik. Satu foto galeri dari Netlify Blobs.
// id unik per foto, jadi cache boleh agresif (immutable).
import { fail, store } from './_shared/lib.mjs';

export const config = { path: '/api/galeri-foto/:nomor' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  const m = new URL(req.url).pathname.match(/\/api\/galeri-foto\/(\d+-[a-f0-9]{8})\/?$/i);
  if (!m) return fail(404, 'Foto tidak ada');

  const blob = await store().getWithMetadata(`galeri:${m[1]}`, { type: 'arrayBuffer' });
  if (!blob || !blob.data) return fail(404, 'Foto tidak ada');

  return new Response(blob.data, {
    headers: {
      'content-type': blob.mimeType || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
