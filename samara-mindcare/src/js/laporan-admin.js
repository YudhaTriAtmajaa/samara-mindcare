// Admin: helper bersama, Dashboard, Data Laporan (+ modal), Kelola Petugas.
// Semua teks dari database dirender lewat textContent (aman.js).
import { supabase, BUCKET } from './supabase-client.js';
import { mulaiAdmin, requireStaff, logout } from './auth.js';
import { renderAdminShell, icon } from './ui.js';
import { el, urlAman } from './aman.js';
import { C as KOL, q as qk, normAll } from './kolom.js';

export const NAMA_KAT = { mental: 'Kesehatan Mental', bullying: 'Bullying', rokok: 'Rokok & Vape' };
export const FULL = { mental: 'Kesehatan Mental', bullying: 'Bullying', rokok: 'Perilaku Merokok' };
export const PEL = { diri_sendiri: 'Diri Sendiri', siswa_lain: 'Siswa Lain', disaksikan: 'Disaksikan' };
const SHORT = { mental: 'Mental', bullying: 'Bullying', rokok: 'Merokok' };
const KIK = { mental: 'mind', bullying: 'tri', rokok: 'smokeoff' };
const LABEL_KAT = { mental: 'Kesehatan Mental', bullying: 'Bullying', rokok: 'Merokok & Vape' };
const TZ = 'Asia/Makassar';
const page = document.body.dataset.page;

// ===== Kalender pekan (Senin 00:00 - Minggu 23:59 WITA, UTC+8 tanpa DST) =====
// Dihitung dari jam aktual & zona WITA, bukan dari zona waktu perangkat pengguna.
const WITA_MS = 8 * 36e5, HARI = 864e5, PEKAN = 7 * HARI;
export const awalPekan = (t = Date.now()) => {
  const d = new Date(t + WITA_MS), dow = (d.getUTCDay() + 6) % 7; // Senin = 0 ... Minggu = 6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * HARI - WITA_MS;
};

export const h = (t, c, k, a) => el(t, { class: c || '', ...a }, k);
export const ik = (n) => { const t = document.createElement('template'); t.innerHTML = icon(n); return t.content.firstChild; };
// Nama siswa yang diisi pelapor: terdampak (mental & bullying) atau pelaku (rokok & vape)
export const namaSiswa = (l) => (l.kategori === 'rokok' ? ['Nama Siswa sebagai Pelaku', l.nama_pelaku] : ['Nama Siswa yang Terdampak', l.nama_terdampak]);
const fmt = (i, o) => new Date(i).toLocaleString('id-ID', { timeZone: TZ, ...o });
export const tgl = (i) => fmt(i, { day: 'numeric', month: 'short', year: 'numeric' });
export const tglPanjang = (i) => fmt(i, { day: 'numeric', month: 'long', year: 'numeric' });
export const jam = (i) => fmt(i, { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
const rel = (i) => { const m = Math.round((Date.now() - new Date(i)) / 60000); return m < 60 ? `${Math.max(m, 1)} menit lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
export const potong = (s, n) => (s.length > n ? s.slice(0, n).trimEnd() + '...' : s);
export const statusPil = (s, v) => h('span', `pil pil-${s} ${v || ''}`, [ik(s === 'sudah' ? 'checkcircle' : 'hourglass'), s === 'sudah' ? 'Sudah Ditindaklanjuti' : 'Belum Ditindaklanjuti']);
// Badge kategori isu seragam untuk semua halaman admin (warna & ikon lewat CSS .kat.*)
export const badgeKat = (k) => h('span', `kat ${k}`, [ik(KIK[k]), LABEL_KAT[k]]);
// Skeleton loader tabel & penanda angka
export const skTabel = (rows = 6, cols = 5) => h('div', 'skl-table', Array.from({ length: rows }, () => h('div', 'skl-tr', Array.from({ length: cols }, () => h('div', 'skl skl-l', '', { style: 'width:72%' })), { style: `grid-template-columns:repeat(${cols},1fr)` })));
export const kosong = (host, t) => host.replaceChildren(h('p', 'adm-state', t));

// Guard + kerangka admin
export async function mulaiShell(active) {
  const staf = await requireStaff();
  if (!staf) return null;
  return { staf, panel: renderAdminShell(active, logout) };
}

// Pagination sungguhan
export function pager(host, total, page0, per, go, unit = 'laporan') {
  const n = Math.max(1, Math.ceil(total / per));
  const a = total ? page0 * per + 1 : 0, b = Math.min(total, (page0 + 1) * per);
  const btn = (t, p, cls, off) => { const x = h('button', cls, t, { type: 'button' }); if (off) x.disabled = true; else x.addEventListener('click', () => go(p)); return x; };
  const st = Math.max(0, Math.min(page0 - 2, n - 5));
  const nums = Array.from({ length: Math.min(n, 5) }, (_, i) => btn(String(st + i + 1), st + i, st + i === page0 ? 'on' : '', false));
  host.replaceChildren(
    h('span', 'pg-info', ['Menampilkan ', h('b', '', `${a}–${b}`), ' dari ', h('b', '', String(total)), ` ${unit}`]),
    h('div', 'pg-nav', [btn('Sebelumnya', page0 - 1, '', page0 === 0), ...nums, btn('Selanjutnya', page0 + 1, '', page0 >= n - 1)]));
}

// Pratinjau gambar besar (klik gambar lampiran). Esc / klik latar / tombol X menutup pratinjau saja.
function lightbox(src, alt, opener) {
  const tutup = () => { ov.remove(); document.removeEventListener('keydown', kb, true); opener?.focus(); };
  const kb = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tutup(); } else if (e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); x.focus(); } };
  const x = h('button', 'x lb-x', [ik('x')], { type: 'button', 'aria-label': 'Tutup pratinjau', onclick: tutup });
  const ov = h('div', 'lb', [x, el('img', { src, alt })], { role: 'dialog', 'aria-modal': 'true', 'aria-label': alt });
  ov.addEventListener('click', (e) => { if (e.target !== ov.querySelector('img')) tutup(); });
  document.addEventListener('keydown', kb, true); document.body.append(ov); x.focus();
}

// Lampiran: gambar asli lewat signed URL privat (5 menit -> 2 menit), cadangan ikon + keterangan
export async function lampiran(paths) {
  if (!paths?.length) return [];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 120);
  return paths.map((p, i) => {
    const top = h('div', 'att-top'), u = urlAman(data?.[i]?.signedUrl);
    const fb = () => top.replaceChildren(ik('image'), h('span', '', 'Lampiran ' + (i + 1)));
    if (u) { top.classList.add('skl'); const im = el('img', { src: u, alt: 'Lampiran ' + (i + 1) }); im.addEventListener('load', () => top.classList.remove('skl')); im.addEventListener('error', () => { top.classList.remove('skl'); fb(); }); const z = h('button', 'zoom', [im], { type: 'button', 'aria-label': 'Perbesar Lampiran ' + (i + 1), title: 'Klik untuk memperbesar' }); z.addEventListener('click', () => lightbox(u, 'Lampiran ' + (i + 1), z)); top.append(z); } else fb();
    return h('div', 'att', [top, h('div', 'att-bot', [h('span', 'att-name', p.split('/').pop()), h('span', 'chip sm', 'Lampiran ' + (i + 1))])]);
  });
}

export function unduhCsv(rows, nama) {
  const q = (x) => '"' + String(x ?? '').replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"';
  const baris = [['Tanggal', 'Kategori', 'Berkaitan', 'Nama Siswa Terdampak', 'Nama Siswa Pelaku', 'Bentuk', 'Waktu', 'Lokasi', 'Status', 'Isi'].map(q).join(',')];
  rows.forEach((l) => baris.push([tgl(l.dibuat_pada) + ' ' + jam(l.dibuat_pada), FULL[l.kategori], PEL[l.pelapor], l.nama_terdampak, l.nama_pelaku, l.bentuk, l.waktu, l.lokasi, l.status, l.isi].map(q).join(',')));
  const a = el('a', { href: URL.createObjectURL(new Blob(['\ufeff' + baris.join('\n')], { type: 'text/csv;charset=utf-8' })), download: nama });
  document.body.append(a); a.click(); a.remove();
}

// ===== Chart.js (dimuat dinamis, hanya di halaman admin) =====
let C;
async function chartJs() {
  if (!C) { const m = await import('chart.js'); m.Tooltip.positioners.cursor = (_it, pos) => pos; m.Tooltip.positioners.bar = (it) => (it.length ? { x: it[0].element.x, y: it[0].element.y } : false); m.Chart.register(m.BarController, m.BarElement, m.DoughnutController, m.ArcElement, m.CategoryScale, m.LinearScale, m.Tooltip); C = m.Chart; }
  return C;
}
// Body admin memakai `zoom: .8`, sehingga koordinat kursor yang dibaca Chart.js meleset dari posisi sebenarnya.
// Plugin ini menghitung ulang posisi kursor relatif terhadap kanvas (rasio ukuran layout / ukuran tampil).
const zoomFix = { id: 'zoomFix', beforeEvent(chart, args) {
  const e = args.event, n = e.native;
  if (!n || n.clientX == null) { const t = n?.changedTouches?.[0] || n?.touches?.[0]; if (!t) return; n.clientX = t.clientX; n.clientY = t.clientY; }
  const cvs = chart.canvas, r = cvs.getBoundingClientRect();
  if (!r.width || !r.height) return;
  e.x = (n.clientX - r.left) * (chart.width / r.width);
  e.y = (n.clientY - r.top) * (chart.height / r.height);
} };
const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const TT = () => ({ enabled: true, backgroundColor: cv('--olive-900') || '#2e3b10', titleColor: '#fff', bodyColor: '#fff', padding: 12, cornerRadius: 12, displayColors: false, titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 }, bodyFont: { family: 'Plus Jakarta Sans', size: 12 } });
// Bar: angka tampil di atas SETIAP batang; hover / klik / sentuh = tooltip detail
export async function barChart(canvas, labels, data, { suffix = '', chip = false, bar = 48, titles = null, unit = 'laporan', axis = null } = {}) {
  const Chart = await chartJs();
  const max = Math.max(0, ...data), pk = max ? data.indexOf(max) : -1;
  const plugin = { id: 'lbl', afterDatasetsDraw(c) {
    const ctx = c.ctx, m = c.getDatasetMeta(0);
    data.forEach((d, i) => {
      const b = m.data[i], top = chip && i === pk;
      ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = cv('--ink-900'); ctx.font = '700 12px Plus Jakarta Sans';
      ctx.fillText(d + (i === pk ? suffix : ''), b.x, b.y - (top ? 30 : 10));
      if (top) { ctx.fillStyle = cv('--peach-200'); ctx.beginPath(); ctx.roundRect(b.x - 28, b.y - 24, 56, 18, 9); ctx.fill(); ctx.fillStyle = cv('--brown-badge'); ctx.font = '700 11px Plus Jakarta Sans'; ctx.fillText('Puncak', b.x, b.y - 11); }
      ctx.restore();
    });
  } };
  const ch = new Chart(canvas, { type: 'bar', plugins: [plugin],
    data: { labels, datasets: [{ data, backgroundColor: data.map((_, i) => (i === pk ? cv('--olive-800') : cv('--lime-300'))), hoverBackgroundColor: cv('--olive-600'), borderRadius: 999, borderSkipped: false, maxBarThickness: bar }] },
    options: { maintainAspectRatio: false, layout: { padding: { top: 40, right: 8 } }, events: [], // hover ditangani sendiri di bawah (akurat terhadap zoom halaman)
      plugins: { legend: { display: false }, tooltip: { ...TT(), position: 'bar', callbacks: { title: (it) => (titles ? titles[it[0].dataIndex] : it[0].label), label: (it) => `${it.parsed.y} ${unit}${it.dataIndex === pk && max ? ' (puncak)' : ''}` } } },
      scales: {
        x: { display: true, grid: { display: false }, border: { display: false }, ticks: { display: true, color: cv('--ink-600'), font: (c) => ({ family: 'Plus Jakarta Sans', size: 12, weight: c.index === pk ? '700' : '400' }) }, title: axis ? { display: true, text: axis.x, color: cv('--ink-600'), font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' }, padding: { top: 8 } } : { display: false } },
        y: axis ? { display: true, beginAtZero: true, suggestedMax: max + 1, ticks: { display: true, precision: 0, stepSize: Math.max(1, Math.ceil((max + 1) / 5)), color: cv('--ink-600'), font: { family: 'Plus Jakarta Sans', size: 11 } }, grid: { color: cv('--line-soft') || '#eee' }, border: { display: false }, title: { display: true, text: axis.y, color: cv('--ink-600'), font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' } } } : { display: false, beginAtZero: true } } } });
  // Hover akurat: posisi kursor dikonversi ke koordinat kanvas dengan rasio ukuran tampil / ukuran layout,
  // sehingga tetap tepat walau halaman admin memakai `zoom: .8`. Tooltip menempel di puncak batang yang di-hover.
  const bagi = (a, b) => (b ? a / b : 1);
  const cari = (ev) => {
    const t = ev.touches?.[0] || ev.changedTouches?.[0] || ev, r = canvas.getBoundingClientRect();
    if (!r.width || !r.height || t.clientX == null) return -1;
    const x = (t.clientX - r.left) / bagi(r.width, canvas.offsetWidth || r.width), y = (t.clientY - r.top) / bagi(r.height, canvas.offsetHeight || r.height);
    const els = ch.getDatasetMeta(0).data, area = ch.chartArea;
    const step = els.length > 1 ? Math.abs(els[1].x - els[0].x) : area.right - area.left;
    for (let i = 0; i < els.length; i++) {
      const b = els[i].getProps(['x', 'y', 'base', 'width'], true), lebar = Math.max(8, Math.min(step, (b.width || bar) + 8)) / 2;
      if (Math.abs(x - b.x) <= lebar && y >= b.y - 4 && y <= b.base + 2) return i;
    }
    return -1;
  };
  let aktif = -2;
  const tampil = (i) => {
    if (i === aktif || !ch.canvas) return; aktif = i;
    const a = i < 0 ? [] : [{ datasetIndex: 0, index: i }], b = i < 0 ? { x: 0, y: 0 } : ch.getDatasetMeta(0).data[i];
    ch.setActiveElements(a); ch.tooltip.setActiveElements(a, { x: b.x, y: b.y }); ch.update('none');
    canvas.style.cursor = i < 0 ? 'default' : 'pointer';
  };
  const onMove = (ev) => tampil(cari(ev)), onOut = () => tampil(-1);
  const ev = [['mousemove', onMove], ['click', onMove], ['touchstart', onMove, { passive: true }], ['touchmove', onMove, { passive: true }], ['mouseleave', onOut]];
  ev.forEach(([n, f, o]) => canvas.addEventListener(n, f, o));
  const hancur = ch.destroy.bind(ch);
  ch.destroy = () => { ev.forEach(([n, f]) => canvas.removeEventListener(n, f)); canvas.style.cursor = ''; hancur(); };
  return ch;
}
// Donut: persentase di tiap irisan (opsional lewat { pct }); hover / klik / sentuh = tooltip (nama, jumlah, persen)
export async function donut(canvas, data, colors, labels = [], { pct = true } = {}) {
  const Chart = await chartJs();
  const tot = data.reduce((a, b) => a + b, 0), ada = tot > 0;
  const plugin = { id: 'pct', afterDatasetsDraw(c) {
    if (!ada || !pct) return;
    const ctx = c.ctx;
    c.getDatasetMeta(0).data.forEach((arc, i) => {
      const p = Math.round((data[i] / tot) * 100);
      if (p < 6) return;
      const ang = (arc.startAngle + arc.endAngle) / 2, r = (arc.innerRadius + arc.outerRadius) / 2;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '800 12px Plus Jakarta Sans'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p + '%', arc.x + Math.cos(ang) * r, arc.y + Math.sin(ang) * r); ctx.restore();
    });
  } };
  return new Chart(canvas, { type: 'doughnut', plugins: [zoomFix, plugin], data: { labels, datasets: [{ data: ada ? data : [1], backgroundColor: ada ? colors : [cv('--sand-200')], borderWidth: 0, borderRadius: 20, spacing: 4, hoverOffset: 8 }] },
    options: { cutout: '68%', maintainAspectRatio: false, layout: { padding: 8 },
      onHover: (e, el) => { e.native.target.style.cursor = el.length && ada ? 'pointer' : 'default'; },
      plugins: { legend: { display: false }, tooltip: { ...TT(), enabled: ada, callbacks: { title: (it) => labels[it[0].dataIndex] || '', label: (it) => `${it.parsed} laporan (${Math.round((it.parsed / tot) * 100)}%)` } } } } });
}

// ===== Dashboard =====
const cnt = (f) => { const q = supabase.from('laporan').select('id', { count: 'exact', head: true }); return (f ? f(q) : q).then((r) => r.count ?? 0); };
async function dashboard() {
  const sh = await mulaiShell('dashboard'); if (!sh) return;
  const { panel } = sh;
  const stat = (ic, cls, chip, label, id) => h('article', 'adm-stat', [h('span', `ibox ${cls}`, [ik(ic)]), h('div', 'body', [h('span', `chip sm ${cls}`, chip), h('div', 'val', [h('p', '', label), h('b', 'skl-num', '0', { id })])])]);
  const lst = h('div', 'tw', [skTabel(5, 4)]);
  panel.replaceChildren(
    h('h1', 'adm-h1', 'Selamat datang kembali.'), h('p', 'adm-sub', 'Guru SMA Muhammadiyah 2 Samarinda.'),
    h('div', 'stats', [stat('archive', 'green', 'Akumulasi', 'Total Laporan Masuk', 's-tot'), stat('clipclock', 'peach', 'Perlu atensi', 'Belum Ditindaklanjuti', 's-bel'), stat('checkcircle', 'lime', 'Terselesaikan', 'Sudah Ditindaklanjuti', 's-sud'), stat('calendar', '', 'Mingguan', 'Laporan Minggu Ini', 's-pkn')]),
    h('div', 'grid-a', [
      h('section', 'card2', [h('h2', '', 'Tren Laporan Masuk'), h('p', 's', 'Aktivitas pelaporan selama 6 pekan terakhir semester ganjil'), h('div', 'chart-box skl-load', [h('canvas', '', '', { id: 'c-tren' })]), h('div', 'strip', [h('span', '', [h('i', 'dotc'), ' ', h('span', '', '', { id: 'avg' })]), h('span', '', '', { id: 'pk' })])]),
      h('section', 'card2', [h('div', 'hd', [h('h2', '', 'Komposisi Kasus'), h('b', '', '', { id: 'valid' })]), h('p', 's', 'Pembagian kategori aduan siswa SMA Muhammadiyah 2'), h('div', 'donut skl-load', [h('canvas', '', '', { id: 'c-komp' }), h('div', 'mid', [h('span', '', 'Dominan'), h('b', '', '', { id: 'dom-p' }), h('span', '', '', { id: 'dom-n' })])]), h('div', 'legend', '', { id: 'leg' })])]),
    h('section', 'card2', [h('div', 'hd', [h('h2', '', 'Daftar Laporan Terbaru'), h('span', 'chip sm', 'Minggu Ini')]), h('p', 's', 'Identitas pelapor terenkripsi penuh, Hanya data kasus yang ditampilkan'), lst]));
  const $ = (i) => panel.querySelector('#' + i);
  const iso = (ms) => new Date(ms).toISOString();
  const KAT = ['bullying', 'mental', 'rokok'];
  const [tot, bel, sud, pkn, ...kk] = await Promise.all([cnt(), cnt((q) => q.eq('status', 'belum')), cnt((q) => q.eq('status', 'sudah')), cnt((q) => q.gte(KOL.tanggal, iso(awalPekan()))), ...KAT.map((k) => cnt((q) => q.eq(KOL.kategori, k)))]);
  [['s-tot', tot], ['s-bel', bel], ['s-sud', sud], ['s-pkn', pkn]].forEach(([i, v]) => { $(i).textContent = String(v); $(i).classList.remove('skl-num'); });
  const ready = (id) => () => $(id).parentElement.classList.remove('skl-load');
  // Tren 6 pekan kalender (Senin-Minggu WITA); pekan terakhir = pekan berjalan. Jumlah per pekan dihitung di database
  // berdasarkan tanggal masuk laporan (tanggal_masuk), sehingga tidak terbatas jumlah baris yang diunduh.
  let grafik = null;
  async function muatTren() {
    const cur = awalPekan(), ws = Array.from({ length: 6 }, (_, i) => cur - (5 - i) * PEKAN);
    const per = await Promise.all(ws.map((s) => cnt((q) => q.gte(KOL.tanggal, iso(s)).lt(KOL.tanggal, iso(s + PEKAN)))));
    const mx = Math.max(...per);
    $('avg').textContent = `Rata-rata: ${(per.reduce((x, y) => x + y, 0) / 6).toFixed(1)} laporan/pekan`;
    $('pk').textContent = mx ? `Puncak laporan: Pekan ${per.indexOf(mx) + 1}` : 'Belum ada laporan';
    grafik?.destroy();
    grafik = await barChart($('c-tren'), per.map((_, i) => `Pekan ${i + 1}`), per, { suffix: ' Laporan', axis: { x: 'Pekan', y: 'Jumlah laporan masuk' }, titles: ws.map((s, i) => `Pekan ${i + 1} (${tgl(s)} – ${tgl(s + PEKAN - 1)})${i === 5 ? ' · berjalan' : ''}`) });
  }
  muatTren().then(ready('c-tren'), ready('c-tren'));
  $('valid').textContent = `${tot} Total Valid`;
  const pc = (n) => (tot ? Math.round((n / tot) * 100) : 0), di = kk.indexOf(Math.max(...kk));
  $('dom-p').textContent = pc(kk[di]) + '%'; $('dom-n').textContent = tot ? FULL[KAT[di]] : '–';
  const nm = { bullying: ['Bullying', 'Perundungan'], mental: ['Kesehatan Mental', 'Stres'], rokok: ['Perilaku Merokok &', 'Disiplin'] };
  $('leg').replaceChildren(...KAT.map((k, i) => h('div', 'lg', [h('i', `dotc c${i + 1}`), h('span', 'n', nm[k].join(' / ').replace('& /', '&')), h('span', 'v', [`${kk[i]} kasus `, h('span', '', `(${pc(kk[i])}%)`)])])));
  donut($('c-komp'), kk, [cv('--olive-600'), cv('--olive-400'), cv('--orange-400')], KAT.map((k) => FULL[k]), { pct: false }).then(ready('c-komp'), ready('c-komp'));
  // Hanya laporan pekan berjalan (Senin-Minggu WITA, sama dengan kartu "Laporan Minggu Ini"), semuanya ditampilkan tanpa pagination
  async function muat() {
    const { data: dataMentah, error } = await supabase.from('laporan').select(['id', KOL.kategori, 'nama_terdampak', 'nama_pelaku', 'status', KOL.tanggal].join(',')).gte(KOL.tanggal, iso(awalPekan())).order(KOL.tanggal, { ascending: false }).limit(1000);
    if (error) return kosong(lst, 'Gagal memuat data.');
    const data = normAll(dataMentah);
    if (!data.length) { kosong(lst, 'Belum ada laporan minggu ini'); return; }
    lst.replaceChildren(h('table', 't2', [h('thead', '', [h('tr', '', ['Nama (Terdampak/Pelaku)', 'Kategori Isu', 'Tanggal Masuk', 'Status'].map((t) => h('th', '', t)))]),
      h('tbody', '', data.map((l) => h('tr', '', [
        h('td', 'cd', namaSiswa(l)[1] || '–'),
        h('td', '', [badgeKat(l.kategori)]),
        h('td', 'dt', [tgl(l.dibuat_pada), h('small', '', jam(l.dibuat_pada) + ' WITA')]),
        h('td', '', [statusPil(l.status)])])))]));
  }
  muat();
  // Pergantian pekan otomatis: saat halaman dibiarkan terbuka melewati Senin 00:00 WITA, kartu, grafik & daftar disegarkan
  const jadwalPekan = () => setTimeout(async () => {
    const n = await cnt((q) => q.gte(KOL.tanggal, iso(awalPekan())));
    $('s-pkn').textContent = String(n);
    await Promise.all([muatTren(), muat()]);
    jadwalPekan();
  }, Math.min(awalPekan() + PEKAN - Date.now() + 1500, 2 ** 31 - 1));
  jadwalPekan();
}

// ===== Data Laporan =====
async function dataLaporan() {
  const sh = await mulaiShell('data'); if (!sh) return;
  const { panel } = sh;
  const sel = (opts) => h('select', '', opts.map(([v, t]) => h('option', '', t, { value: v })));
  const q = el('input', { type: 'search', placeholder: 'Cari kata kunci, nama siswa, atau lokasi', 'aria-label': 'Cari' });
  const fk = sel([['', 'Semua Kategori'], ['bullying', 'Bullying'], ['mental', 'Kesehatan Mental'], ['rokok', 'Merokok & Vape']]);
  const fs = sel([['', 'Semua Status'], ['belum', 'Belum Ditindaklanjuti'], ['sudah', 'Sudah Ditindaklanjuti']]);
  const fb = el('input', { type: 'month', 'aria-label': 'Bulan' });
  const rst = h('button', 'rb', [ik('rotate')], { type: 'button', 'aria-label': 'Reset filter' });
  const baru = h('b', '', '0'), tb = h('div', 'tw', [skTabel(8, 7)]), pg = h('div', 'pg'), exp = h('button', '', [ik('download'), h('span', '', 'Ekspor Rekap (CSV)')], { type: 'button' });
  panel.replaceChildren(
    h('div', 'adm-head', [h('div', '', [h('h1', 'adm-h1', 'Data Laporan Siswa'), h('p', 'adm-sub', 'Arsip pelaporan masuk seputar isu kesehatan mental, bullying, dan rokok di SMA Muhammadiyah 2 Samarinda.')]),
      h('div', 'ctr', [h('div', '', [ik('msgplus'), h('span', '', [h('small', '', 'Laporan Terbuka'), baru, ' Kasus Baru'])]), exp])]),
    h('div', 'flt', [h('label', 'fi q', [ik('search'), q]), h('label', 'fi', [fk]), h('label', 'fi', [fs]), h('label', 'fi', [ik('calendar'), 'Bulan Ini:', fb]), rst]),
    h('section', 'card2', [h('div', 'ttl', 'Daftar Antrean Masuk'), tb, pg]));
  cnt((x) => x.eq('status', 'belum')).then((n) => { baru.textContent = String(n); });
  let p = 0;
  const filt = (x) => {
    const t = q.value.trim();
    if (t) { const s = t.replace(/[,()%*]/g, ' '); x = x.or(`isi.ilike.%${s}%,lokasi.ilike.%${s}%,${qk(KOL.bentuk)}.ilike.%${s}%,nama_terdampak.ilike.%${s}%,nama_pelaku.ilike.%${s}%`); }
    if (fk.value) x = x.eq(KOL.kategori, fk.value);
    if (fs.value) x = x.eq('status', fs.value);
    if (fb.value) { const [y, mo] = fb.value.split('-').map(Number); x = x.gte(KOL.tanggal, new Date(Date.UTC(y, mo - 1, 1, -8)).toISOString()).lt(KOL.tanggal, new Date(Date.UTC(y, mo, 1, -8)).toISOString()); }
    return x;
  };
  async function muat() {
    tb.classList.add('skl-busy');
    const { data: dataMentah, count, error } = await filt(supabase.from('laporan').select('*', { count: 'exact' })).order(KOL.tanggal, { ascending: false }).range(p * 10, p * 10 + 9);
    tb.classList.remove('skl-busy');
    if (error) return kosong(tb, 'Gagal memuat data.');
    const data = normAll(dataMentah);
    if (!data.length) { kosong(tb, 'Belum ada laporan'); pg.replaceChildren(); return; }
    tb.replaceChildren(h('table', 't2', [h('thead', '', [h('tr', '', ['Nama (Terdampak/Pelaku)', 'Kategori Isu', 'Tanggal Masuk', 'Berkaitan', 'Lokasi', 'Status', 'Aksi'].map((t) => h('th', '', t)))]),
      h('tbody', '', data.map((l) => h('tr', '', [
        h('td', 'cd', namaSiswa(l)[1] || '–'),
        h('td', '', [badgeKat(l.kategori)]),
        h('td', 'dt', [tgl(l.dibuat_pada), h('small', '', jam(l.dibuat_pada) + ' WITA')]),
        h('td', 'dt', PEL[l.pelapor]), h('td', 'mut', l.lokasi || '–'), h('td', '', [statusPil(l.status)]),
        h('td', '', [h('button', 'btn2', 'Lihat', { type: 'button', onclick: (e) => modal(l, e.currentTarget) })])])))]));
    pager(pg, count, p, 10, (n) => { p = n; muat(); });
  }
  const reload = () => { p = 0; muat(); };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(reload, 300); });
  [fk, fs, fb].forEach((x) => x.addEventListener('change', reload));
  rst.addEventListener('click', () => { q.value = ''; fk.value = ''; fs.value = ''; fb.value = ''; reload(); });
  exp.addEventListener('click', async () => { const { data } = await filt(supabase.from('laporan').select('*')).order(KOL.tanggal, { ascending: false }).limit(2000); unduhCsv(normAll(data), 'rekap-laporan.csv'); });
  muat();
}

async function modal(l, opener) {
  const ub = (lb, v, ic, c, full) => h('div', 'ub' + (full ? ' full' : ''), [lb, h('b', '', [h('span', c, [ik(ic)]), v])]);
  const att = await lampiran(l.gambar);
  const bodyOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
  const tutup = () => { ov.remove(); document.body.style.overflow = bodyOv; document.removeEventListener('keydown', kb); opener?.focus(); };
  const x = h('button', 'x', [ik('x')], { type: 'button', 'aria-label': 'Tutup', onclick: tutup });
  const body = h('div', 'md-b', [
    h('div', 'sec', [ik('clipboard'), 'Rincian Informasi Masuk']),
    h('div', 'tg', [ub(namaSiswa(l)[0], namaSiswa(l)[1] || '–', 'user'), ub('Subjek Terkait', PEL[l.pelapor], 'users'), ub('Kategori Isu', FULL[l.kategori], 'tri', 'c1', true), ub('Waktu Kejadian', l.waktu || '–', 'alarm', 'c1'), ub('Bentuk Keluhan / Perilaku', l.bentuk, 'alert', 'c2'), ...(l.kategori === 'mental' ? [ub('Situasi / Kondisi Pemicu', l.pemicu || '–', 'activity', 'c2', true)] : []), ub('Lokasi Spesifik Kejadian', l.lokasi || '–', 'pin', '', true)]),
    h('div', 'sec', [ik('quote'), 'Deskripsi Lengkap Kejadian']), h('div', 'qb', [h('p', '', `“${l.isi}”`)]),
    att.length ? h('div', 'sec', [ik('clip'), `Bukti Gambar & Lampiran (${att.length} Berkas)`]) : null, att.length ? h('div', 'ag', att) : null]);
  const ov = h('div', 'ov', [h('div', 'md', [
    h('div', 'md-h', [h('div', '', [h('h2', '', 'Detail Laporan'), h('span', `pil pil-${l.status} nodot`, (l.status === 'sudah' ? 'SUDAH' : 'BELUM') + ' DITINDAKLANJUTI'), h('div', 't', [ik('clock'), `${tglPanjang(l.dibuat_pada)}, ${jam(l.dibuat_pada)} WITA`])]), x]),
    body, l.status === 'belum' ? h('div', 'md-f', [h('a', 'cta', ['Tindak Lanjut Sekarang', ik('arrow')], { href: `/admin/form-tindak-lanjut.html?id=${encodeURIComponent(l.id)}` })]) : null])], { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Detail laporan ' + namaSiswa(l)[1] });
  ov.addEventListener('click', (e) => { if (e.target === ov) tutup(); });
  const kb = (e) => {
    if (e.key === 'Escape') return tutup();
    if (e.key !== 'Tab') return;
    const f = [...ov.querySelectorAll('a[href],button')]; if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown', kb); document.body.append(ov); x.focus();
}

// ===== Kelola petugas (tidak diubah) =====
async function petugas() {
  const body = document.getElementById('tbody');
  const msg = document.getElementById('msg');
  const tampil = (t, err) => { msg.textContent = t; msg.hidden = !t; msg.className = 'msg' + (err ? ' err' : ''); };
  async function panggil(payload) {
    const { data, error } = await supabase.functions.invoke('kelola-petugas', { body: payload });
    if (error || data?.error) throw new Error(data?.error || 'Permintaan gagal.');
    return data;
  }
  async function muat() {
    const { data } = await supabase.from('petugas').select('user_id, nama, email, aktif').order('nama');
    body.replaceChildren(...(data || []).map((p) => el('tr', {}, [
      el('td', { text: p.nama }), el('td', { text: p.email }),
      el('td', {}, [el('span', { class: 'chip-sm' + (p.aktif ? '' : ' neutral'), text: p.aktif ? 'Aktif' : 'Nonaktif' })]),
      el('td', {}, [el('button', { class: 'btn btn-cream btn-sm', type: 'button', text: p.aktif ? 'Nonaktifkan' : 'Aktifkan',
        onclick: async () => { try { await panggil({ aksi: 'aktif', user_id: p.user_id, aktif: !p.aktif }); muat(); } catch (e) { tampil(e.message, true); } } })]),
    ])));
  }
  document.getElementById('form-petugas').addEventListener('submit', async (e) => {
    e.preventDefault(); tampil('');
    const f = e.target;
    try {
      await panggil({ aksi: 'tambah', nama: f.nama.value.trim(), email: f.email.value.trim(), password: f.password.value });
      f.reset(); tampil('Petugas berhasil ditambahkan.'); muat();
    } catch (err) { tampil(err.message, true); }
  });
  muat();
}

(async () => {
  if (page === 'dashboard') dashboard();
  else if (page === 'data') dataLaporan();
  else if (page === 'petugas' && (await mulaiAdmin('petugas'))) petugas();
})();