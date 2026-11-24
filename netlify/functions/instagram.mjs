// GET /api/instagram - data profil Instagram kelas yang boleh ditampilkan publik.
import { json, fail, store } from './_shared/lib.mjs';

export const config = { path: '/api/instagram' };

const DEFAULTS = {
  sectionTitle: 'Instagram kelas',
  sectionSubtitle: 'Cerita harian dan momen kelas ada di sini.',
  username: 'ofc_xeternall',
  posts: 83,
  followers: 94,
  following: 62,
  bio: '✦ Welcome to eternall class ✦\\n🏫 PART OF @smkn1karangtengah.labschool\\n👨‍🎓 35 students\\n👨 28 boys · 👩 7 girls\\n💻 Software Engineering',
  buttonText: 'Kunjungi Instagram',
  photoVersion: 0,
};

export default async (req) => {
  if (req.method !== 'GET') return fail(405, 'Metode harus GET');

  const saved = await store().get('instagram:settings', { type: 'json' });
  const settings = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  const username = /^[A-Za-z0-9._]{1,30}$/.test(String(settings.username))
    ? String(settings.username)
    : DEFAULTS.username;

  return json({
    instagram: {
      sectionTitle: String(settings.sectionTitle || DEFAULTS.sectionTitle),
      sectionSubtitle: String(settings.sectionSubtitle || DEFAULTS.sectionSubtitle),
      username,
      posts: Number.isSafeInteger(Number(settings.posts)) ? Number(settings.posts) : DEFAULTS.posts,
      followers: Number.isSafeInteger(Number(settings.followers)) ? Number(settings.followers) : DEFAULTS.followers,
      following: Number.isSafeInteger(Number(settings.following)) ? Number(settings.following) : DEFAULTS.following,
      bio: String(settings.bio || ''),
      buttonText: String(settings.buttonText || DEFAULTS.buttonText),
      photoUrl: settings.photoVersion
        ? `/api/instagram-foto?v=${encodeURIComponent(settings.photoVersion)}`
        : '/img/ig-kelas.jpg',
    },
  });
};
