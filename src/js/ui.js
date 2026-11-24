// UI bersama: ikon SVG (gaya Lucide), navbar, footer, hamburger.
// Catatan: innerHTML hanya dipakai untuk templat statis, TIDAK untuk data pengguna.
import '../css/tokens.css';
import '../css/base.css';
import '../css/components.css';

import { icon } from './icons.js';
import { navbarHTML, footerHTML } from './chrome-template.js';

export { icon };
// Ganti <i data-ic="nama"> dengan SVG
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach((el) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = icon(el.dataset.ic);
    el.replaceWith(tpl.content.firstChild);
  });
}

// Deteksi sesi admin tanpa memuat klien Supabase di halaman publik: token sesi tersimpan di localStorage (dihapus saat logout)
function adaSesiAdmin() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k)) { const v = JSON.parse(localStorage.getItem(k)); if (v && v.access_token && v.refresh_token) return true; }
    }
  } catch { /* abaikan */ }
  return false;
}
// Tombol "Masuk" hanya berubah menjadi "Dashboard" bila sesi benar-benar valid & petugas aktif (diverifikasi ke Supabase).
// Selama verifikasi, tombol disembunyikan (tata letak tetap) agar tidak ada label yang salah sempat tampil.
let verifKe = 0;
// Status tombol dipegang oleh kelas "adm-on" pada <html>, yang dipasang SINKRON oleh public/splash.js sebelum render pertama:
// ada token sesi admin (dan belum pernah ditolak) -> "Dashboard"; tidak ada sesi -> "Masuk".
// Label diganti lewat CSS (dua <span>), jadi tidak ada kedipan saat pindah halaman.
// Verifikasi ke Supabase berjalan di latar belakang dan HANYA mengubah tombol bila hasilnya pasti
// (sesi hilang / bukan petugas aktif). Galat jaringan atau timeout tidak mengubah tampilan.
function tampilTombol(a) {
  const on = document.documentElement.classList.contains('adm-on');
  a.setAttribute('href', on ? '/admin/dashboard.html' : '/admin/login.html');
  if (!a.querySelector('.lbl-dash')) a.textContent = on ? 'Dashboard' : 'Masuk'; // cadangan bila templat lama
}
function setTombol(a, on, simpan = true) {
  document.documentElement.classList.toggle('adm-on', on);
  tampilTombol(a);
  try { if (!simpan) localStorage.removeItem('samara_adm_ok'); else localStorage.setItem('samara_adm_ok', on ? '1' : '0'); } catch { /* abaikan */ }
}
async function sinkronTombolMasuk() {
  const a = document.querySelector('[data-masuk]'); if (!a) return;
  if (!adaSesiAdmin()) { setTombol(a, false, false); return; }
  // Ada token: tampil "Dashboard" kecuali sebelumnya sudah dipastikan bukan petugas aktif
  let ditolak = false;
  try { ditolak = localStorage.getItem('samara_adm_ok') === '0'; } catch { /* abaikan */ }
  document.documentElement.classList.toggle('adm-on', !ditolak);
  tampilTombol(a);
  const n = ++verifKe;
  let on = null; // null = tidak pasti
  try {
    const { supabase } = await import('./supabase-client.js');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) on = false;
    else {
      const { data: p, error } = await supabase.from('petugas').select('aktif').eq('user_id', session.user.id).maybeSingle();
      if (!error) on = !!(p && p.aktif);
    }
  } catch { on = null; }
  if (n === verifKe && on !== null) setTombol(a, on);
}

// Favicon logo SAMARA MindCare (dipasang dari sini agar berlaku di semua halaman publik & admin)
function pasangFavicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  [['icon', '/logo/favicon.png', 'image/png'], ['apple-touch-icon', '/logo/logo-app.png', '']].forEach(([rel, href, type]) => {
    const l = document.createElement('link'); l.rel = rel; l.href = href; if (type) l.type = type; document.head.append(l);
  });
}

// Saat tautan internal diklik: (1) tandai agar halaman tujuan melewati skeleton/splash (lihat public/splash.js),
// (2) beri umpan balik instan (garis kemajuan di atas + menu yang diklik langsung bertanda aktif), supaya
// saat jaringan lambat pengguna tahu klik sudah diterima dan tidak perlu menekan dua kali.
function tandaiNavigasiInternal() {
  const de = document.documentElement;
  let timer;
  const bersihkan = () => { clearTimeout(timer); de.classList.remove('nav-pending'); };
  window.addEventListener('pageshow', bersihkan);
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let u; try { u = new URL(a.href, location.href); } catch { return; }
    if (u.origin !== location.origin || /^\/admin\//.test(u.pathname) || /^\/admin\//.test(location.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return; // halaman yang sama: biarkan perilaku bawaan
    try { sessionStorage.setItem('samara_nav', String(Date.now())); } catch { /* abaikan */ }
    de.classList.add('nav-pending');
    clearTimeout(timer); timer = setTimeout(bersihkan, 10000); // jaga-jaga bila navigasi batal
    const menu = a.closest('.nav-menu');
    if (menu) { menu.querySelectorAll('a').forEach((x) => x.classList.toggle('active', x === a)); }
  }, true);
}

export function initChrome() {
  if (!/^\/admin\//.test(location.pathname)) { tandaiNavigasiInternal(); }
  pasangFavicon();
  const nb = document.getElementById('navbar');
  // Pada build, navbar & footer sudah disisipkan ke HTML oleh plugin Vite; render ulang hanya bila masih kosong (mis. mode dev)
  if (nb && !nb.firstElementChild) nb.innerHTML = navbarHTML(nb.dataset.active, icon);
  const ft = document.getElementById('footer');
  if (ft && !ft.firstElementChild) ft.innerHTML = footerHTML();
  hydrateIcons();
  // Tetap sinkron bila admin login/logout di tab lain atau halaman dipulihkan dari cache tombol Kembali
  sinkronTombolMasuk();
  window.addEventListener('storage', sinkronTombolMasuk);
  window.addEventListener('pageshow', sinkronTombolMasuk);
  const bar = document.querySelector('.navbar');
  const tg = document.querySelector('.nav-toggle');
  if (bar && tg) {
    const setOpen = (open) => {
      bar.classList.toggle('open', open);
      tg.setAttribute('aria-expanded', String(open));
      tg.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    };
    tg.addEventListener('click', () => setOpen(!bar.classList.contains('open')));
    // Menu melayang ditutup saat: klik di luar navbar, klik salah satu tautan, tekan Esc, atau layar dilebarkan ke desktop
    document.addEventListener('click', (e) => { if (bar.classList.contains('open') && !bar.contains(e.target)) setOpen(false); });
    bar.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.nav-panel a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bar.classList.contains('open')) { setOpen(false); tg.focus(); } });
    window.matchMedia('(min-width: 861px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChrome);
else initChrome();

// Lepas skeleton halaman publik setelah seluruh halaman (termasuk gambar) siap
function lepasSkeleton() {
  const s = document.getElementById('pg-skel');
  if (!s) return;
  s.classList.add('done'); setTimeout(() => s.remove(), 350);
}
// Layar sambutan (logo + sapaan): tampil minimal 1,8 dtk agar terbaca, lalu memudar setelah halaman siap
function lepasSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;
  const sisa = Math.max(0, 1800 - performance.now());
  setTimeout(() => {
    // JANGAN memanggil window.scrollTo(0, 0) di sini: dengan html { scroll-behavior: smooth } (dan gambar besar yang
    // membuat event "load" tertunda), pengguna yang sudah men-scroll ke bawah akan ditarik naik lagi ke atas.
    // Posisi awal di atas sudah dijamin oleh public/splash.js (scrollRestoration = 'manual').
    sp.classList.add('done');
    setTimeout(() => { sp.remove(); document.documentElement.classList.remove('splash-on'); try { history.scrollRestoration = 'auto'; } catch { /* abaikan */ } }, 600);
  }, sisa);
}
function lepasSemua() { lepasSkeleton(); lepasSplash(); }
if (document.readyState === 'complete') lepasSemua(); else window.addEventListener('load', lepasSemua);

// ===== Kerangka panel admin (sidebar + panel + footer) =====
// Konten panel (#panel) disediakan halaman; data pengguna tidak pernah lewat innerHTML.
const ADM_MENU = [['dashboard', '/admin/dashboard.html', 'Dashboard', 'grid'], ['data', '/admin/data-laporan.html', 'Data Laporan', 'inbox'], ['tindak', '/admin/tindak-lanjut.html', 'Tindak Lanjut', 'clipcheck'], ['statistik', '/admin/statistik.html', 'Statistik', 'trend']];
export function renderAdminShell(active, onLogout) {
  const root = document.getElementById('adm-root');
  const panel = document.getElementById('panel');
  if (!root || !panel) return null;
  document.body.classList.add('adm-body');
  try { localStorage.setItem('samara_adm_ok', '1'); } catch { /* abaikan */ } // guard admin sudah memverifikasi petugas aktif
  document.getElementById('sk-side')?.remove();
  panel.removeAttribute('aria-busy'); panel.removeAttribute('aria-label');
  const side = document.createElement('aside');
  side.className = 'adm-side';
  side.innerHTML = `<div class="adm-brand"><img class="adm-logo" src="/logo/logo-horizontal.png" alt="SAMARA MindCare" width="426" height="143" decoding="async"><span class="tag">Admin</span></div>
    <nav class="adm-menu" aria-label="Menu admin">${ADM_MENU.map(([k, h, t, i]) => `<a href="${h}" class="${k === active ? 'on' : ''}"${k === active ? ' aria-current="page"' : ''}>${icon(i)}${t}</a>`).join('')}</nav>
    <div class="adm-bottom"><button type="button" class="btn-out" id="adm-out">${icon('logout')}Keluar</button><a class="adm-pub" href="/" data-publik>← Lihat Beranda Utama</a></div>`;
  side.querySelector('#adm-out').addEventListener('click', onLogout);
  // Website publik tidak bergantung pada sesi admin: pindah halaman langsung ke beranda, tanpa melewati guard login
  side.querySelector('[data-publik]').addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); location.assign('/');
  });
  const main = document.createElement('div');
  const foot = document.createElement('p');
  foot.className = 'adm-foot';
  foot.textContent = 'Panel Administrasi SAMARA MindCare · SMA Muhammadiyah 2 Samarinda';
  root.classList.add('adm');
  panel.replaceWith(main);
  main.append(panel, foot);
  root.prepend(side);
  return panel;
}
