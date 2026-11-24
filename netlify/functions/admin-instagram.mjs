// POST /api/admin/instagram - simpan pengaturan profil Instagram kelas.
import {
  json, fail, sameOrigin, verifySession, store,
} from './_shared/lib.mjs';

export const config = { path: '/api/admin/instagram' };

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULTS = {
  sectionTitle: 'Instagram kelas',
  sectionSubtitle: 'Cerita harian dan momen kelas ada di sini.',
  username: 'ofc_xeternall',
  posts: 83,
  followers: 94,
  following: 62,
  bio: '✦ Welcome to eternall class ✦\n🏫 PART OF @smkn1karangtengah.labschool\n👨‍🎓 35 students\n👨 28 boys · 👩 7 girls\n💻 Software Engineering',
  buttonText: 'Kunjungi Instagram',
  photoVersion: 0,
};

const getText = (form, name, max, fallback = '') => {
  const value = form.get(name);
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, max);
};

const getCount = (form, name, fallback) => {
  const raw = getText(form, name, 12, String(fallback));
  if (!/^\d{1,9}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
};

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Metode harus POST');
  if (!sameOrigin(req)) return fail(403, 'Origin tidak valid');
  if (!verifySession(req)) return fail(401, 'Sesi berakhir. Login dulu.');

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_PHOTO_BYTES + 64 * 1024) {
    return fail(413, 'Ukuran permintaan terlalu besar. Foto maksimal 4 MB.');
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'Form tidak valid');
  }

  const username = getText(form, 'username', 30).replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return fail(400, 'Username Instagram hanya boleh berisi huruf, angka, titik, dan underscore (1–30 karakter).');
  }

  const posts = getCount(form, 'posts', DEFAULTS.posts);
  const followers = getCount(form, 'followers', DEFAULTS.followers);
  const following = getCount(form, 'following', DEFAULTS.following);
  if ([posts, followers, following].some((value) => value === null)) {
    return fail(400, 'Jumlah postingan, pengikut, dan mengikuti harus berupa angka 0–999999999.');
  }

  const photo = form.get('photo');
  const hasPhoto = photo && typeof photo !== 'string' && photo.size > 0;
  if (hasPhoto) {
    if (!PHOTO_TYPES.includes(photo.type)) return fail(400, 'Foto harus JPG, PNG, atau WebP.');
    if (photo.size > MAX_PHOTO_BYTES) return fail(400, 'Ukuran foto maksimal 4 MB.');
  }

  const previous = await store().get('instagram:settings', { type: 'json' }) || {};
  const settings = {
    sectionTitle: getText(form, 'sectionTitle', 60, DEFAULTS.sectionTitle) || DEFAULTS.sectionTitle,
    sectionSubtitle: getText(form, 'sectionSubtitle', 180, DEFAULTS.sectionSubtitle),
    username,
    posts,
    followers,
    following,
    bio: getText(form, 'bio', 600, DEFAULTS.bio),
    buttonText: getText(form, 'buttonText', 40, DEFAULTS.buttonText) || DEFAULTS.buttonText,
    photoVersion: previous.photoVersion || 0,
  };

  if (hasPhoto) {
    const bytes = await photo.arrayBuffer();
    settings.photoVersion = Date.now();
    await store().set('instagram:profile', bytes, {
      metadata: { contentType: photo.type },
    });
  }

  await store().setJSON('instagram:settings', settings);

  return json({
    ok: true,
    instagram: {
      ...settings,
      photoUrl: settings.photoVersion
        ? `/api/instagram-foto?v=${settings.photoVersion}`
        : '/img/ig-kelas.jpg',
    },
  });
};
