// GET /api/admin/data - data dashboard (butuh sesi valid).
// Mengembalikan komentar lengkap (nama, pesan, waktu, IP, perangkat, lokasi)
// dan statistik pengunjung: total, per hari 30 hari terakhir, tabel per IP.
import {
  json, fail, verifySession, getData, DEFAULT_MURID, DEFAULT_STRUKTUR,
} from './_shared/lib.mjs';

export const config = { path: '/api/admin/data' };

const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const komentar = await getData('komentar') || [];
  const kunjungan = await getData('kunjungan') || [];

  // Grafik per hari: 30 hari terakhir, termasuk hari kosong.
  const perHari = [];
  const map = new Map();
  for (const v of kunjungan) {
    if (typeof v?.t !== 'number') continue;
    const k = dayKey(v.t);
    map.set(k, (map.get(k) || 0) + 1);
  }
  const today = Date.now();
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(today - i * 24 * 3600 * 1000);
    perHari.push({ hari: k, jumlah: map.get(k) || 0 });
  }

  // Tabel per IP: kunjungan terakhir tiap IP.
  const lastPerIp = new Map();
  for (const v of kunjungan) {
    if (!v || typeof v.t !== 'number') continue;
    const prev = lastPerIp.get(v.ip);
    if (!prev || v.t > prev.t) lastPerIp.set(v.ip, v);
  }
  const ipTerakhir = [...lastPerIp.values()]
    .sort((a, b) => b.t - a.t)
    .slice(0, 300)
    .map(({ ip, t, path }) => ({ ip, t, path }));

  const startOfDay = new Date(dayKey(Date.now())).getTime();
  const murid = await getData('murid');
  const struktur = await getData('struktur');

  return json({
    komentar,
    murid: murid || DEFAULT_MURID, // awal: Murid 1 sampai Murid 34
    struktur: struktur || DEFAULT_STRUKTUR,
    kunjungan: {
      total: kunjungan.length,
      hariIni: kunjungan.filter((v) => typeof v?.t === 'number' && v.t >= startOfDay).length,
      perHari,
      ipTerakhir,
    },
  });
};
