// Autentikasi admin: email + kata sandi + Cloudflare Turnstile, penjaga halaman, navigasi admin.
import '../css/tokens.css';
import '../css/base.css';
import '../css/components.css';
import '../css/admin.css';
import { supabase } from './supabase-client.js';
import { el } from './aman.js';
import { icon } from './ui.js';

// Login: email + kata sandi + token Turnstile. Token diverifikasi SERVER oleh Supabase Auth
// (CAPTCHA protection, secret key tersimpan di Supabase, tidak pernah ke front-end).
export async function loginSandi(email, password, captchaToken) {
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) {
    const e = new Error('Email atau kata sandi tidak sesuai.');
    if (error.code === 'captcha_failed' || /captcha/i.test(error.message || '')) e.kode = 'captcha';
    else if (error.status === 429 || error.code === 'over_request_rate_limit') e.kode = 'batas';
    throw e;
  }
}

// Ambil data petugas aktif untuk sesi saat ini (null bila tidak ada sesi / bukan petugas aktif)
async function ambilPetugas() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: p } = await supabase.from('petugas').select('nama, aktif').eq('user_id', session.user.id).maybeSingle();
  if (!p || !p.aktif) return null;
  return { user: session.user, nama: p.nama };
}

// Keluar: tampilkan dialog konfirmasi dulu; sesi baru diakhiri setelah petugas menyetujui
export function logout(e) {
  if (document.getElementById('cf-keluar')) return;
  const opener = e?.currentTarget || document.activeElement;
  const tutup = () => { ov.remove(); document.removeEventListener('keydown', kb); opener?.focus?.(); };
  const batal = el('button', { type: 'button', class: 'cf-no', text: 'Batal', onclick: tutup });
  const ya = el('button', { type: 'button', class: 'cf-yes', text: 'Ya, Keluar', onclick: async () => {
    ya.disabled = true; batal.disabled = true; ya.textContent = 'Keluar…';
    await supabase.auth.signOut();
    location.href = '/admin/login.html';
  } });
  const ic = document.createElement('span'); ic.className = 'cf-ic'; ic.innerHTML = icon('logout');
  const ov = el('div', { class: 'ov', id: 'cf-keluar' }, [el('div', { class: 'cf', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'cf-t', 'aria-describedby': 'cf-d' }, [
    ic, el('h2', { id: 'cf-t', text: 'Keluar dari Panel Admin?' }),
    el('p', { id: 'cf-d', text: 'Sesi Anda akan diakhiri dan Anda perlu masuk kembali untuk mengakses panel admin SAMARA MindCare.' }),
    el('div', { class: 'cf-act' }, [batal, ya])])]);
  const kb = (ev) => {
    if (ev.key === 'Escape' && !ya.disabled) return tutup();
    if (ev.key === 'Tab') { const f = [batal, ya].filter((x) => !x.disabled); if (!f.length) return ev.preventDefault(); const i = f.indexOf(document.activeElement); ev.preventDefault(); f[(i + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  };
  ov.addEventListener('click', (ev) => { if (ev.target === ov && !ya.disabled) tutup(); });
  document.addEventListener('keydown', kb); document.body.append(ov); batal.focus();
}

// Penjaga: wajib login dan terdaftar sebagai petugas aktif
export async function requireStaff() {
  const staf = await ambilPetugas();
  if (!staf) { await supabase.auth.signOut(); location.replace('/admin/login.html'); return null; }
  return staf;
}

const MENU = [
  ['dashboard', '/admin/dashboard.html', 'Dashboard'],
  ['data', '/admin/data-laporan.html', 'Data Laporan'],
  ['tindak', '/admin/tindak-lanjut.html', 'Tindak Lanjut'],
  ['statistik', '/admin/statistik.html', 'Statistik'],
  ['petugas', '/admin/petugas.html', 'Petugas'],
];

// Render navigasi admin dengan DOM aman
export function renderAdminNav(active, nama) {
  const host = document.getElementById('admin-nav');
  if (!host) return;
  const nav = el('nav', { 'aria-label': 'Menu admin' }, MENU.map(([k, h, t]) => el('a', { href: h, class: k === active ? 'active' : '', text: t })));
  host.className = 'admin-nav';
  host.replaceChildren(
    el('a', { class: 'brand', href: '/admin/dashboard.html', 'aria-label': 'SAMARA MindCare, ke dashboard admin' }, [el('img', { class: 'brand-img', src: '/logo/logo-horizontal.png', alt: 'SAMARA MindCare', width: '426', height: '143' })]),
    nav,
    el('div', { class: 'nav-actions' }, [
      el('span', { class: 'brand-sub', text: nama || '' }),
      el('button', { class: 'btn btn-green btn-sm', type: 'button', text: 'Keluar', onclick: logout }),
    ]),
  );
}

// Inisialisasi umum halaman admin
export async function mulaiAdmin(active) {
  const staf = await requireStaff();
  if (staf) renderAdminNav(active, staf.nama);
  return staf;
}

// ===== Halaman login =====
const MAKS_COBA = 5;                 // batas percobaan
const KUNCI_MS = 5 * 60 * 1000;      // kunci sementara 5 menit
const KEY = 'samara_login';          // hanya menyimpan hitungan, TIDAK menyimpan kata sandi

function adaTokenSesi() {
  try { for (let i = 0; i < localStorage.length; i++) { if (/^sb-.+-auth-token$/.test(localStorage.key(i))) return true; } } catch { /* abaikan */ }
  return false;
}

function mulaiLogin() {
  const $ = (id) => document.getElementById(id);
  // Bila ada sesi tersimpan, sembunyikan form sampai pengecekan selesai agar tidak ada kilatan halaman login sebelum masuk dashboard
  const cek = adaTokenSesi();
  if (cek) { document.body.classList.add('lg-cek'); setTimeout(() => document.body.classList.remove('lg-cek'), 4000); }
  const form = $('login-form');
  const baca = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } };
  const tulis = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* abaikan */ } };
  let tsToken = null, tsWidget = null;

  const tampilError = (judul, isi) => { $('lg-err-title').textContent = judul; $('lg-err-text').textContent = isi; $('lg-error').hidden = false; };
  const tutupError = () => { $('lg-error').hidden = true; };
  $('lg-err-x').addEventListener('click', tutupError);

  // Tombol mata: tampil/sembunyikan kata sandi
  const eye = $('lg-eye');
  eye.addEventListener('click', () => {
    const pw = $('password');
    const lihat = pw.type === 'password';
    pw.type = lihat ? 'text' : 'password';
    eye.setAttribute('aria-label', lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    const t = document.createElement('template'); t.innerHTML = icon(lihat ? 'eyeoff' : 'eye');
    eye.replaceChildren(t.content.firstChild);
  });

  // Cloudflare Turnstile (token sekali pakai: wajib di-reset setelah tiap percobaan)
  const renderTurnstile = () => {
    const box = $('turnstile-box');
    if (!box || !window.turnstile) return;
    box.replaceChildren();
    tsWidget = window.turnstile.render(box, {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, language: 'id', size: 'flexible',
      callback: (t) => { tsToken = t; },
      'expired-callback': () => { tsToken = null; },
      'error-callback': () => { tsToken = null; },
    });
  };
  const resetTurnstile = () => { tsToken = null; if (window.turnstile && tsWidget != null) window.turnstile.reset(tsWidget); };
  window.onTurnstileReady = renderTurnstile;
  if (window.turnstile) renderTurnstile();
  else {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady';
    s.async = true; s.defer = true;
    document.head.append(s);
  }

  const loading = (btn, on, teks) => { btn.disabled = on; btn.firstElementChild.textContent = on ? 'Memproses…' : teks; };

  // Catat kegagalan & hitung sisa percobaan
  function gagal(judul) {
    const s = baca(); s.n += 1;
    if (s.n >= MAKS_COBA) { s.until = Date.now() + KUNCI_MS; s.n = 0; tulis(s); return tampilError('Terlalu banyak percobaan.', 'Akses dikunci sementara. Silakan coba lagi dalam 5 menit.'); }
    tulis(s);
    tampilError(judul, `Silakan periksa kembali kredensial Anda. Percobaan login tersisa ${MAKS_COBA - s.n} kali.`);
  }
  function terkunci() {
    const s = baca();
    if (s.until > Date.now()) {
      const menit = Math.ceil((s.until - Date.now()) / 60000);
      tampilError('Terlalu banyak percobaan.', `Akses dikunci sementara. Silakan coba lagi dalam ${menit} menit.`);
      return true;
    }
    return false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); tutupError();
    if (terkunci()) return;
    const email = form.email.value.trim(), pw = form.password.value;
    if (!email || !pw) return gagal('Email atau kata sandi tidak sesuai.');
    if (!tsToken) return tampilError('Verifikasi keamanan diperlukan.', 'Mohon selesaikan verifikasi keamanan terlebih dahulu.');
    const btn = $('lg-submit'); loading(btn, true, 'Masuk ke Panel');
    try {
      await loginSandi(email, pw, tsToken);
      const staf = await ambilPetugas();
      if (!staf) { await supabase.auth.signOut(); throw new Error('bukan petugas'); }
      tulis({ n: 0, until: 0 });
      form.password.value = '';
      location.href = '/admin/dashboard.html';
      return;
    } catch (err) {
      if (err.kode === 'captcha') tampilError('Verifikasi keamanan gagal.', 'Verifikasi tidak valid atau sudah kedaluwarsa. Silakan ulangi verifikasi lalu masuk kembali.');
      else if (err.kode === 'batas') tampilError('Terlalu banyak percobaan.', 'Silakan coba lagi beberapa menit lagi.');
      else gagal('Email atau kata sandi tidak sesuai.');
    } finally { loading(btn, false, 'Masuk ke Panel'); resetTurnstile(); }
  });

  // Penjaga: bila sudah login sebagai petugas aktif, langsung ke dashboard
  (async () => { if (await ambilPetugas()) location.replace('/admin/dashboard.html'); else document.body.classList.remove('lg-cek'); })();
}
if (document.body.dataset.page === 'login') mulaiLogin();