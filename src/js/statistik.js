// Admin: statistik agregat. Data diambil per rentang lalu diagregasi di klien. Chart.js dimuat dinamis.
import { supabase } from './supabase-client.js';
import { C as KOL, normAll } from './kolom.js';
import { h, ik, skTabel, mulaiShell, barChart, donut, unduhCsv, kosong, badgeKat, awalPekan, FULL, NAMA_KAT } from './laporan-admin.js';
export { NAMA_KAT };

const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const KAT = ['bullying', 'mental', 'rokok'];
const DESK = { bullying: ['Perundungan (Bullying)', 'Verbal & psikososial'], mental: ['Kesehatan Mental', 'Kecemasan akademik & stres'], rokok: ['Perilaku Merokok / Vape', 'Pelanggaran tata tertib'] };
const bln = (d) => d.toLocaleString('id-ID', { month: 'short', timeZone: 'Asia/Makassar' });
const bulanPanjang = (d) => d.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' });

function rentang(k, a, b) {
  const n = new Date();
  if (k === 'minggu') { const m = awalPekan(); return [new Date(m), new Date(m + 7 * 864e5 - 1)]; } // pekan kalender berjalan: Senin 00:00 - Minggu 23:59 WITA
  if (k === '3bulan') return [new Date(n - 90 * 864e5), n];
  if (k === 'kustom' && a && b) return [new Date(a + 'T00:00:00+08:00'), new Date(b + 'T23:59:59+08:00')];
  return [new Date(n.getFullYear(), n.getMonth(), 1), n];
}

(async () => {
  const sh = await mulaiShell('statistik'); if (!sh) return;
  const { panel } = sh;
  let k = 'bulan', rows = [], charts = [];
  const el$ = (c, ...x) => h('div', c, x);
  const card = (t, sub, ic, kids) => h('section', 'card2 st', [h('div', 'hd', [h('div', '', [h('h2', '', t), h('p', 's', sub)]), h('span', 'ibox', [ik(ic)])]), ...kids]);
  const seg = h('div', 'seg', [['minggu', 'Minggu Ini'], ['bulan', 'Bulan Ini'], ['3bulan', '3 Bulan Terakhir'], ['kustom', 'Rentang Kustom']].map(([v, t]) => h('button', '', t, { type: 'button', 'data-k': v })));
  const d1 = h('input', '', '', { type: 'date', 'aria-label': 'Dari tanggal' }), d2 = h('input', '', '', { type: 'date', 'aria-label': 'Sampai tanggal' });
  const kus = h('div', 'kus', [d1, d2]); kus.hidden = true;
  const exp = h('button', 'btn2 exp', [ik('download'), 'Ekspor Data (CSV)'], { type: 'button' });
  const subD = h('p', 's'), subT = h('p', 's'), ttlT = h('h2', '', 'Tren Laporan Per Pekan'),  c1 = h('div', 'legend'), mid = h('b', '', '0'), locs = h('div'), efek = h('div'), ras = h('div');
  const cD = h('canvas'), cT = h('canvas'), cR = h('canvas'), midR = h('b', '', '0'), lgR = h('div', 'legend');
  panel.replaceChildren(
    h('div', 'adm-head', [h('div', '', [h('h1', 'adm-h1', 'Statistik & Analisis Tren Laporan'), h('p', 'adm-sub', 'Wawasan data agregat untuk perbaikan iklim sekolah dan intervensi pencegahan SMA Muhammadiyah 2 Samarinda.')])]),
    h('div', 'st-bar', [h('div', 'lf', [seg, kus]), exp]),
    h('div', 'grid-b', [
      h('section', 'card2 st', [h('div', 'hd', [h('div', '', [h('h2', '', 'Distribusi Kategori Laporan'), subD]), h('span', 'ibox', [ik('pie')])]), h('div', 'donut big skl-load', [cD, h('div', 'mid', [mid, h('span', '', 'LAPORAN')])]), c1]),
      h('section', 'card2 st', [h('div', 'hd', [h('div', '', [ttlT, subT]), h('span', 'chip sm', [h('i', 'dotc'), 'Total Masuk'])]), h('div', 'chart-box skl-load', [cT])])]),
    h('div', 'grid-3', [card('Lokasi Kejadian Kritis', 'Fokus pada insiden perundungan & merokok', 'navigation', [locs]), card('Efektivitas Tindak Lanjut', 'Kecepatan respon guru SMA Muhammadiyah 2 & wali kelas', 'checkcircle', [efek]), card('Rasio Subjek Pelapor', 'Siapa yang menjadi korban dalam aduan', 'users', [ras])]));

  async function muat() {
    const [a, b] = rentang(k, d1.value, d2.value);
    [locs, efek, c1, ras].forEach((x) => x.replaceChildren(skTabel(3, 1)));
    [cD, cT, cR].forEach((c) => c.parentElement?.classList.add('skl-load'));
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.k === k));
    kus.hidden = k !== 'kustom';
    // Hanya kolom yang dipakai grafik (tanpa isi laporan) supaya data yang diunduh kecil; Chart.js dimuat paralel dengan query.
    import('chart.js').catch(() => {});
    const { data, error } = await supabase.from('laporan').select(['id', KOL.kategori, KOL.pelapor, 'lokasi', 'status', KOL.tanggal, 'ditindak_pada'].join(',')).gte(KOL.tanggal, a.toISOString()).lte(KOL.tanggal, b.toISOString()).limit(5000);
    rows = normAll(data);
    charts.forEach((c) => c.destroy()); charts = [];
    const tot = rows.length, cn = (f) => rows.filter(f).length;
    const kk = KAT.map((x) => cn((r) => r.kategori === x)), pc = (n) => (tot ? Math.round((n / tot) * 100) : 0);
    if (error) { kosong(locs, 'Gagal memuat data.'); return; }
    // Distribusi
    subD.textContent = `Total ${tot} aduan masuk ${k === 'bulan' ? 'bulan berjalan' : 'pada rentang terpilih'}`;
    mid.textContent = String(tot);
    c1.replaceChildren(...KAT.map((x, i) => h('div', 'lg', [h('i', `dotc c${i === 0 ? 1 : i === 1 ? 2 : 3}`), h('span', 'n', [h('b', '', DESK[x][0]), h('small', '', DESK[x][1])]), h('span', 'v', [h('b', '', `${pc(kk[i])}%`), `${kk[i]} Kasus`])])));
    charts.push(await donut(cD, kk, [cv('--olive-600'), cv('--olive-400'), cv('--amber-300')], KAT.map((x2) => DESK[x2][0]), { pct: false }));
    cD.parentElement.classList.remove('skl-load');
    // Tren per pekan
    // Per hari (hari tanpa laporan = 0): filter "Minggu Ini" dan "Rentang Kustom" sepanjang maks. 14 hari. Selebihnya per pekan.
    const hariRentang = Math.max(1, Math.ceil((b - a) / 864e5)), harian = k === 'minggu' || (k === 'kustom' && hariRentang <= 14), unit = harian ? 864e5 : 7 * 864e5;
    // Rentang kustom lebih dari 1 bulan (> 31 hari) dikelompokkan per bulan kalender WITA, bukan per pekan.
    const bulanan = k === 'kustom' && hariRentang > 31;
    const wm = (t) => { const d = new Date(t + 8 * 36e5); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }; // indeks bulan (WITA)
    const m0 = wm(a.getTime());
    const nmBln = (i, fmtBln) => new Date(Date.UTC(Math.floor((m0 + i) / 12), (m0 + i) % 12, 1)).toLocaleString('id-ID', { month: fmtBln, year: 'numeric', timeZone: 'UTC' });
    const st = a.getTime(), nb = bulanan ? wm(b.getTime()) - m0 + 1 : k === 'minggu' ? 7 : Math.max(1, Math.ceil((b - a) / unit)), per = Array(nb).fill(0);
    rows.forEach((r) => { const t = new Date(r.dibuat_pada).getTime(), i = Math.min(nb - 1, bulanan ? wm(t) - m0 : Math.floor((t - st) / unit)); if (i >= 0) per[i] += 1; });
    const fd = (d) => d.toLocaleString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });
    const fh = (d) => d.toLocaleString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' });
    ttlT.textContent = bulanan ? 'Tren Laporan Per Bulan' : harian ? 'Tren Laporan Per Hari' : 'Tren Laporan Per Pekan';
    const fy = (d) => d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' });
    const lb = bulanan ? per.map((_, i) => nmBln(i, 'short')) : harian ? per.map((_, i) => (nb <= 10 ? [fh(new Date(st + i * unit)), fd(new Date(st + i * unit))] : fd(new Date(st + i * unit)))) : per.map((_, i) => `Pekan ${i + 1}`);
    subT.textContent = bulanan ? `Volume laporan masuk per bulan (${fy(a)} – ${fy(b)})` : harian ? `Volume laporan masuk per hari (${fy(a)} – ${fy(new Date(st + (nb - 1) * unit))})` : `Dinamika volume laporan masuk (${bulanPanjang(a)}${bulanPanjang(a) === bulanPanjang(b) ? '' : ' - ' + bulanPanjang(b)})`;
    const ttl = bulanan ? per.map((_, i) => nmBln(i, 'long')) : harian ? per.map((_, i) => `${fh(new Date(st + i * unit))}, ${fd(new Date(st + i * unit))}`) : per.map((_, i) => `Pekan ke-${i + 1} (${fd(new Date(st + i * unit))} – ${fd(new Date(Math.min(b.getTime(), st + (i + 1) * unit - 864e5)))})`);
    charts.push(await barChart(cT, lb, per, { chip: true, bar: bulanan ? 36 : harian ? (nb <= 10 ? 44 : 28) : 36, titles: ttl, axis: { x: bulanan ? 'Bulan' : harian ? (nb <= 10 ? 'Hari' : 'Tanggal') : 'Pekan', y: 'Jumlah laporan masuk' } }));
    cT.parentElement.classList.remove('skl-load');
    // Lokasi kritis
    const lk = {};
    rows.filter((r) => r.kategori !== 'mental' && r.lokasi).forEach((r) => { const o = (lk[r.lokasi.trim()] ||= { n: 0, k: {} }); o.n += 1; o.k[r.kategori] = (o.k[r.kategori] || 0) + 1; });
    const top = Object.entries(lk).sort((x, y) => y[1].n - x[1].n).slice(0, 4), mx = top[0]?.[1].n || 1;
    locs.replaceChildren(...(top.length ? top.map(([nm, o], i) => {
      const bar = h('i', i === 2 ? 'c3' : i === 3 ? 'c4' : ''); bar.style.width = `${Math.round((o.n / mx) * 100)}%`;
      const dom = Object.entries(o.k).sort((x, y) => y[1] - x[1])[0][0];
      return h('div', 'loc', [h('div', 'tr', [h('span', '', nm), h('span', '', `${o.n} kejadian`)]), h('div', 'pb', [bar]), h('small', 'dom', ['Dominan: ', badgeKat(dom)])]);
    }) : [h('p', 'adm-state', 'Belum ada data lokasi')]));
    // Efektivitas
    const sd = rows.filter((r) => r.status === 'sudah'), bl = tot - sd.length, pe = tot ? Math.round((sd.length / tot) * 100) : 0;
    const ts = sd.filter((r) => r.ditindak_pada).map((r) => (new Date(r.ditindak_pada) - new Date(r.dibuat_pada)) / 36e5);
    const avg = ts.length ? (ts.reduce((x, y) => x + y, 0) / ts.length).toFixed(1).replace('.', ',') : '–';
    const NS = 'http://www.w3.org/2000/svg', C = 2 * Math.PI * 60;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 140 140'); svg.setAttribute('width', '140'); svg.setAttribute('height', '140'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${pe}% terselesaikan`);
    const ttl2 = document.createElementNS(NS, 'title'); ttl2.textContent = `${sd.length} dari ${tot} laporan sudah ditindaklanjuti (${pe}%), ${bl} menunggu respon`; svg.append(ttl2);
    const cir = (col, extra) => { const c = document.createElementNS(NS, 'circle'); [['cx', 70], ['cy', 70], ['r', 60], ['fill', 'none'], ['stroke', col], ['stroke-width', 12]].forEach(([a2, v]) => c.setAttribute(a2, v)); Object.entries(extra || {}).forEach(([a2, v]) => c.setAttribute(a2, v)); return c; };
    const tx = (y, sz, w, t2) => { const e = document.createElementNS(NS, 'text'); [['x', 70], ['y', y], ['text-anchor', 'middle'], ['font-size', sz], ['font-weight', w], ['fill', cv('--ink-900')]].forEach(([a2, v]) => e.setAttribute(a2, v)); e.textContent = t2; return e; };
    svg.append(cir('#eadfc0'), cir(cv('--olive-600'), { 'stroke-linecap': 'round', 'stroke-dasharray': `${(C * pe) / 100} ${C}`, transform: 'rotate(-90 70 70)' }), tx(76, 30, 800, `${pe}%`), tx(94, 11, 400, 'Terselesaikan'));
    efek.replaceChildren(h('div', 'ef', [svg, h('p', '', ['Rata-rata waktu tanggap pertama: ', h('b', '', `${avg} jam`), ' sejak laporan disubmit.'])]),
      h('div', 'two', [h('div', '', [h('small', '', 'Selesai Ditangani'), h('b', '', String(sd.length)), ' kasus']), h('div', 'p', [h('small', '', 'Menunggu Respon'), h('b', '', String(bl)), ' kasus', h('div', '', `(${tot ? 100 - pe : 0}%)`)])]));
    // Rasio subjek
    const pl = ['diri_sendiri', 'siswa_lain', 'disaksikan'], lab = ['Diri Sendiri', 'Teman / Siswa Lain', 'Kejadian Disaksikan Langsung'], cls = ['c1', 'c2', 'c4'];
    const pn = pl.map((x) => cn((r) => r.pelapor === x));
    midR.textContent = String(tot);
    lgR.replaceChildren(...pl.map((_, i) => h('div', 'lg', [h('i', `dotc c${i + 1}`), h('span', 'n', lab[i]), h('span', 'v', [h('b', '', `${pc(pn[i])}%`), `${pn[i]} Laporan`])])));
    ras.replaceChildren(h('div', 'donut big skl-load', [cR, h('div', 'mid', [midR, h('span', '', 'LAPORAN')])]), lgR);
    charts.push(await donut(cR, pn, [cv('--olive-600'), cv('--olive-400'), cv('--amber-300')], lab, { pct: false }));
    cR.parentElement.classList.remove('skl-load');
  }
  // Jika terjadi error apa pun, skeleton tidak boleh menggantung selamanya.
  const jalankan = () => muat().catch((e) => { console.error(e); [locs, efek, c1, ras].forEach((x) => kosong(x, 'Gagal memuat data.')); [cD, cT, cR].forEach((c) => c.parentElement?.classList.remove('skl-load')); });
  seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { k = b.dataset.k; jalankan(); } });
  [d1, d2].forEach((x) => x.addEventListener('change', () => { if (d1.value && d2.value) jalankan(); }));
  exp.addEventListener('click', async () => {
    if (confirm('Pilih OK untuk mengunduh CSV, atau Batal untuk mencetak / simpan PDF.')) {
      // Data lengkap (termasuk isi laporan) baru diambil saat ekspor, bukan saat membuka halaman.
      const [a, b] = rentang(k, d1.value, d2.value);
      const { data } = await supabase.from('laporan').select('*').gte(KOL.tanggal, a.toISOString()).lte(KOL.tanggal, b.toISOString()).order(KOL.tanggal, { ascending: false }).limit(5000);
      unduhCsv(normAll(data), 'statistik-laporan.csv');
    } else window.print();
  });
  jalankan();
})();