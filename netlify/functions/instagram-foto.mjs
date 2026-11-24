// GET /api/instagram-foto - foto profil Instagram kelas dari Netlify Blobs.
import { fail, store } from './_shared/lib.mjs';

export const config = { path: '/api/instagram-foto' };

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');

  const blob = await store().getWithMetadata('instagram:profile', { type: 'arrayBuffer' });
  if (!blob || !blob.data) return fail(404, 'Foto profil belum diunggah');

  const contentType = blob.metadata?.contentType || blob.mimeType || 'image/jpeg';
  return new Response(blob.data, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=300, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  });
};
