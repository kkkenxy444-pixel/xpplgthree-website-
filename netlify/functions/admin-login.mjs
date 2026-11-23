// POST /api/admin/login -otentikasi admin.
// Username/password dibaca dari env ADMIN_USER dan ADMIN_PASSWORD,
// dibandingkan timing-safe, TIDAK PERNAH dicatat ke log.
// Gagal 5x per IP -> blokir 15 menit (tersimpan di Netlify Blobs).
import {
  json, fail, sameOrigin, readJson, clientIp, safeEqual,
  createSessionToken, sessionCookie, getLoginState, recordLoginFail, clearLoginFails,
} from './_shared/lib.mjs';

export const config = { path: '/api/admin/login' };

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return fail(500, 'Login belum dikonfigurasi: isi ADMIN_USER dan ADMIN_PASSWORD di Netlify.');
  }

  const ip = clientIp(req, context);
  const state = await getLoginState(ip);
  if (state.until && Date.now() < state.until) {
    const sisa = Math.max(1, Math.ceil((state.until - Date.now()) / 60000));
    return fail(429, `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisa} menit.`);
  }

  const body = await readJson(req, 2000);
  const user = typeof body?.user === 'string' ? body.user : '';
  const pass = typeof body?.password === 'string' ? body.password : '';
  if (!user || !pass) return fail(400, 'Username dan password wajib diisi');

  const userOk = safeEqual(user, process.env.ADMIN_USER);
  const passOk = safeEqual(pass, process.env.ADMIN_PASSWORD);

  if (!(userOk && passOk)) {
    const { fails, blocked } = await recordLoginFail(ip);
    // Tidak ada nilai kredensial yang dicetak di pesan atau log.
    return fail(401, blocked
      ? 'Terlalu banyak gagal. Login diblokir 15 menit.'
      : `Username atau password salah. Sisa ${Math.max(0, 5 - fails)} percobaan.`);
  }

  await clearLoginFails(ip);
  const token = createSessionToken(process.env.ADMIN_USER);
  if (!token) return fail(500, 'SESSION_SECRET belum diisi di Netlify.');

  return json({ ok: true }, 200, {
    'set-cookie': sessionCookie(token),
  });
};
