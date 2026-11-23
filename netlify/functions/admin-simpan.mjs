// POST /api/admin/simpan - simpan murid dan/atau struktur kelas (butuh sesi valid).
// Murid: TEPAT 34 baris. Nama: bebas sampai 60 karakter.
// IG: boleh kosong, atau huruf/angka/titik/underscore maks 30 karakter.
// Field foto TIDAK bisa diedit di sini: kalau data lama punya foto, foto tetap utuh.
import { json, fail, sameOrigin, readJson, verifySession, getData, putData } from './_shared/lib.mjs';

export const config = { path: '/api/admin/simpan' };

const IG_RE = /^[A-Za-z0-9._]{1,30}$/;

function validateMurid(list) {
  if (!Array.isArray(list) || list.length !== 34) return 'Daftar murid harus tepat 34 baris';
  for (const m of list) {
    const nama = typeof m?.nama === 'string' ? m.nama.trim() : '';
    if (!nama || nama.length > 60) return 'Setiap nama wajib diisi dan maksimal 60 karakter';
    const ig = typeof m?.ig === 'string' ? m.ig.trim() : '';
    if (ig && !IG_RE.test(ig)) return 'Username Instagram hanya boleh huruf, angka, titik, underscore (maks 30)';
  }
  return null;
}

function validateStruktur(list) {
  if (!Array.isArray(list) || !list.length || list.length > 12) return 'Struktur minimal 1 dan maksimal 12 tingkat';
  for (const tingkat of list) {
    if (!Array.isArray(tingkat) || !tingkat.length || tingkat.length > 20) return 'Setiap tingkat berisi 1 sampai 20 orang';
    for (const n of tingkat) {
      const jabatan = typeof n?.jabatan === 'string' ? n.jabatan.trim() : '';
      const nama = typeof n?.nama === 'string' ? n.nama.trim() : '';
      if (!jabatan || jabatan.length > 60) return 'Jabatan wajib diisi dan maksimal 60 karakter';
      if (!nama || nama.length > 60) return 'Nama pada struktur wajib diisi dan maksimal 60 karakter';
    }
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const body = await readJson(req, 30000);
  if (!body) return fail(400, 'Data tidak valid');

  if (body.murid !== undefined) {
    const err = validateMurid(body.murid);
    if (err) return fail(400, err);
  }
  if (body.struktur !== undefined) {
    const err = validateStruktur(body.struktur);
    if (err) return fail(400, err);
  }

  if (body.murid !== undefined) {
    // Pertahankan field foto yang sudah ada (tidak diedit lewat dashboard).
    const lama = await getData('murid') || [];
    const murid = body.murid.map((m, i) => {
      const fotoLama = typeof lama[i]?.foto === 'string' && lama[i].foto ? lama[i].foto : undefined;
      const out = { nama: m.nama.trim(), ig: (m.ig || '').trim() };
      if (fotoLama) out.foto = fotoLama;
      return out;
    });
    await putData('murid', murid);
  }

  if (body.struktur !== undefined) {
    const struktur = body.struktur.map((t) => t.map((n) => ({ jabatan: n.jabatan.trim(), nama: n.nama.trim() })));
    await putData('struktur', struktur);
  }

  return json({ ok: true });
};
