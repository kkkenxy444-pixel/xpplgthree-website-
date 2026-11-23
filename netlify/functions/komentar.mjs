// POST /api/komentar - form komentar publik.
// Situs menyimpan: nama, pesan, waktu, IP, user agent, negara/kota.
// Honeypot anti-spam, batas 3 komentar per menit per IP.
// Komentar TIDAK dikirim balik ke publik, hanya tampil di dashboard admin.
import crypto from 'node:crypto';
import { json, fail, sameOrigin, readJson, clientIp, commentRateLimited, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/komentar' };

const MAX_COMMENTS = 500;

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');

  const body = await readJson(req, 3000);
  if (!body) return fail(400, 'Data tidak valid');

  // Honeypot: field tersembunyi yang tidak boleh diisi manusia.
  if (typeof body.web === 'string' && body.web.trim() !== '') {
    return json({ ok: true }); // pura-pura sukses biar bot tidak curiga
  }

  const nama = typeof body.nama === 'string' ? body.nama.trim().slice(0, 60) : '';
  const pesan = typeof body.pesan === 'string' ? body.pesan.trim().slice(0, 500) : '';
  if (!nama || !pesan) return fail(400, 'Nama dan pesan wajib diisi');
  if (pesan.length > 500) return fail(400, 'Pesan maksimal 500 karakter');

  const ip = clientIp(req, context);
  if (await commentRateLimited(ip)) {
    return fail(429, 'Batas 3 komentar per menit. Cerita lagi sebentar lagi ya.');
  }

  const geo = context.geo || {};
  const komentar = await getData('komentar') || [];
  komentar.unshift({
    id: crypto.randomUUID(),
    nama,
    pesan,
    t: Date.now(),
    ip,
    ua: (req.headers.get('user-agent') || '').slice(0, 300),
    negara: String(geo.country || geo.countryName || '').slice(0, 60),
    kota: String(geo.city || geo.timezone || '').slice(0, 60),
  });

  await putData('komentar', komentar.slice(0, MAX_COMMENTS));
  return json({ ok: true });
};
