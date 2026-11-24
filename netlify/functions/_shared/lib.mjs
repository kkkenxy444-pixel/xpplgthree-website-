// Library bersama untuk semua Functions.
// Berisi: response helper, cek Origin, batas body, session cookie HMAC,
// timing-safe compare, dan rate limit berbasis Netlify Blobs.
// File ini TIDAK punya default export, jadi tidak dianggap function oleh Netlify.
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const COOKIE_NAME = 'kelas_ses';
export const SESSION_TTL_S = 12 * 60 * 60; // 12 jam
const MAX_LOGIN_FAILS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const MAX_COMMENTS_PER_MIN = 3;

export const store = () => getStore({ name: 'kelas', consistency: 'strong' });

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });

export const fail = (status, message) => json({ ok: false, error: message }, status);

// Cek header Origin / Sec-Fetch-Site untuk semua request POST.
export function sameOrigin(req) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  if (!host) return false;
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const origin = req.headers.get('origin');
  if (origin) return origin === `${proto}://${host}`;
  // Fetch same-origin POST tanpa Origin (jarang): cek metadata browser.
  const sf = req.headers.get('sec-fetch-site');
  return sf !== 'cross-site';
}

// Baca body JSON dengan batas ukuran. null kalau rusak / kegedean.
export async function readJson(req, max = 6000) {
  const len = Number(req.headers.get('content-length') || '0');
  if (!Number.isFinite(len) || len > max) return null;
  try {
    return JSON.parse((await req.text()).slice(0, max));
  } catch {
    return null;
  }
}

export function clientIp(req, context) {
  if (context?.ip) return context.ip;
  const nf = req.headers.get('x-nf-client-connection-ip');
  if (nf) return nf;
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// ---------- Session cookie (HMAC, HttpOnly, Secure, SameSite=Strict) ----------

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSessionToken(user) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const payload = b64u(JSON.stringify({ u: user, exp: Date.now() + SESSION_TTL_S * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const raw = (req.headers.get('cookie') || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!raw) return null;
  const val = raw.slice(COOKIE_NAME.length + 1);
  const dot = val.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = val.slice(0, dot);
  const mac = Buffer.from(val.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (mac.length !== expected.length || !crypto.timingSafeEqual(mac, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data || typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  // Secure Cookie: hanya dikirim via HTTPS di situs yang sudah deploy.
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_S}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

// ---------- Perbandingan timing-safe untuk kredensial ----------

export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---------- Rate limit tersimpan di Blobs ----------

const loginKey = (ip) => `guard:login:${ip}`;
const komenKey = (ip, minute) => `rate:komen:${ip}:${minute}`;

export async function getLoginState(ip) {
  const s = await store().get(loginKey(ip), { type: 'json' });
  return s && typeof s === 'object' ? s : { fails: 0, until: 0 };
}

export async function recordLoginFail(ip) {
  const s = store();
  const cur = await getLoginState(ip);
  const fails = cur.fails + 1;
  const blocked = fails >= MAX_LOGIN_FAILS;
  await s.setJSON(loginKey(ip),
    { fails: blocked ? 0 : fails, until: blocked ? Date.now() + LOGIN_BLOCK_MS : cur.until || 0 },
    { ttl: 3600 });
  return { fails, blocked };
}

export async function clearLoginFails(ip) {
  await store().setJSON(loginKey(ip), { fails: 0, until: 0 }, { ttl: 3600 });
}

// 3 komentar per menit per IP. true kalau melewati batas.
export async function commentRateLimited(ip) {
  const s = store();
  const minute = Math.floor(Date.now() / 60000);
  const key = komenKey(ip, minute);
  const cur = await s.get(key, { type: 'json' });
  const n = typeof cur?.n === 'number' ? cur.n : 0;
  if (n >= MAX_COMMENTS_PER_MIN) return true;
  await s.setJSON(key, { n: n + 1 }, { ttl: 180 });
  return false;
}

// ---------- Data default (fallback, sama dengan isi bawaan index.html) ----------

export const NAMA_DEFAULT = [
  'ADITYA SAPTA KUSUMA', 'AHMAD BALUKIA', 'AKBAR RAID SULAEMAN', 'ALFI AJRILIAN',
  'ANGGA ADI SYAPUTRA', 'AZIS NUGRAHA', 'DILAN PRATAMA', 'FADIL MAULANA',
  'FARHAN IBNU AZIS', 'FARHAN NURFALAH', 'FITHRA NISA AMELIA', 'HERLINDA ADINDA JUNIANTI',
  'JIAN DWI OKTAJUANI', 'LUTFI MALIKI', 'M KHAIRIL ALI', "M SA'ID FIRMAN MAULANA",
  'MOCH NABIL FAUZI', 'MOH. SAEPUL ANWAR', 'MUHAMAD DIFA', 'MUHAMAD IQBAL PRATAMA',
  'MUHAMAD RAHFAN ARDIANSYAH', 'MUHAMMAD ALIF RAIHAN RAMADHAN', 'MUHAMMAD HARIS', 'RAMADHAN',
  'MUHAMMAD YUAN PUTRA PRATAMA', 'NAPISA MUWAHIDAH', 'NURMAILANI', 'PARHAN ABDUSSALAM',
  'RAFKA AL ARDIANSYAH SAPUTRA', 'RAKHA JABBAR WIBISONO', 'SAAD SAIDAWLOH', 'SENDI MUHAMAD JAELANI',
  'SYIFA QOLBI RAMADHAN FITRI', 'TIARA PEBRIANTI',
];

export const DEFAULT_MURID = NAMA_DEFAULT.map((nama) => ({ nama, ig: '' }));

export const DEFAULT_STRUKTUR = [
  [{ jabatan: 'Wali kelas', nama: 'Nama Wali Kelas' }],
  [{ jabatan: 'Ketua kelas', nama: 'Nama Ketua' }, { jabatan: 'Wakil ketua', nama: 'Nama Wakil' }],
  [{ jabatan: 'Sekretaris', nama: 'Nama Sekretaris' }, { jabatan: 'Bendahara', nama: 'Nama Bendahara' }, { jabatan: 'Seksi kebersihan', nama: 'Nama Seksi' }],
];

// ---------- Penyimpanan data ----------

export async function getData(key) {
  const v = await store().get(key, { type: 'json' });
  return Array.isArray(v) ? v : null;
}

export async function putData(key, value) {
  await store().setJSON(key, value);
}
