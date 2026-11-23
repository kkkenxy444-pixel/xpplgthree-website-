// POST /api/visit - pencatatan kunjungan.
// Menyimpan waktu, IP, path, user agent. Data lebih tua dari 90 hari dibuang.
import { json, fail, sameOrigin, clientIp, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/visit' };

const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 5000;

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');

  const ip = clientIp(req, context);
  const now = Date.now();

  let path = '/';
  try {
    const body = await req.json();
    if (typeof body?.path === 'string') path = body.path.slice(0, 200);
  } catch { /* body boleh kosong */ }

  // User agent dari header server, bukan dari body (mantab terhadap spoofing).
  const ua = (req.headers.get('user-agent') || '').slice(0, 200);

  const old = await getData('kunjungan') || [];
  const fresh = old.filter((v) => typeof v?.t === 'number' && v.t >= now - MAX_AGE_MS);
  fresh.unshift({ t: now, ip, path, ua });

  await putData('kunjungan', fresh.slice(0, MAX_RECORDS));
  return json({ ok: true });
};
