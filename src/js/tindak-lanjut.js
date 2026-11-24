// Admin: daftar Tindak Lanjut (tab belum/sudah) dan form tindak lanjut.
import { supabase, BUCKET } from './supabase-client.js';
import { requireStaff } from './auth.js';
import { el, urlAman } from './aman.js';
import { C, norm, normAll } from './kolom.js';
import { h, ik, skTabel, mulaiShell, pager, lampiran, namaSiswa, tgl, tglPanjang, jam, potong, kosong, kosongTabel, badgeKat, statusPil, FULL, PEL } from './laporan-admin.js';

const page = document.body.dataset.page;
const PER = 10;

async function daftar() {
  const sh = await mulaiShell('tindak'); if (!sh) return;
  const { panel } = sh;
  let st = 'belum', p = 0, urut = 'baru';
  const SUB = { belum: 'Alur penanganan terpadu laporan siswa oleh SMA Muhammadiyah 2 Samarinda.', sudah: 'Alur penanganan terpadu laporan siswa oleh guru SMA Muhammadiyah 2 Samarinda.' };
  const sub = h('p', 'adm-sub'), card = h('section', 'tc', [h('div', '', [skTabel(8, 6)], { style: 'padding:24px' })]);
  const bd = { belum: h('span', 'b', '0'), sudah: h('span', 'b', '0') };
  const tab = (k, t, i) => { const b = h('button', '', [ik(i), t, bd[k]], { type: 'button' }); b.addEventListener('click', () => { st = k; p = 0; fk.value = ''; fm.value = ''; muat(); }); return b; };
  const tabs = { belum: tab('belum', 'Belum Ditindaklanjuti', 'hourglass'), sudah: tab('sudah', 'Sudah Ditindaklanjuti', 'checkcircle') };
  const sel = (o) => h('select', '', o.map(([v, t]) => h('option', '', t, { value: v })));
  const fk = sel([['', 'Semua Kategori'], ['bullying', 'Bullying'], ['mental', 'Kesehatan Mental'], ['rokok', 'Merokok & Vape']]);
  const fm = el('input', { type: 'month', 'aria-label': 'Bulan dan tahun' });
  const fo = sel([['baru', 'Data Terbaru'], ['lama', 'Data Terlama']]); fo.setAttribute('aria-label', 'Urutan data');
  panel.replaceChildren(
    h('div', 'hd hl', [h('span', 'ibox green', [ik('clipcheck')]), h('div', '', [h('h1', 'adm-h1', 'Tindak Lanjut Laporan'), sub])]),
    h('div', 'tabs2', [tabs.belum, tabs.sudah]), card);
  const t = sessionStorage.getItem('samara_toast');
  if (t) { sessionStorage.removeItem('samara_toast'); const x = h('div', 'toast', t, { role: 'status' }); document.body.append(x); setTimeout(() => x.remove(), 3500); }
  const filt = (x) => {
    x = x.eq('status', st);
    if (fk.value) x = x.eq(C.kategori, fk.value);
    if (fm.value) { const [y, m] = fm.value.split('-').map(Number); x = x.gte(C.tanggal, new Date(Date.UTC(y, m - 1, 1, -8)).toISOString()).lt(C.tanggal, new Date(Date.UTC(y, m, 1, -8)).toISOString()); }
    return x;
  };
  async function bukti(l, btn) {
    const w = window.open('', '_blank'); if (w) w.opener = null;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(l.gambar, 120);
    const u = urlAman(data?.[0]?.signedUrl);
    if (w) { if (u) w.location.href = u; else w.close(); }
  }
  async function muat() {
    card.classList.add('skl-busy');
    ['belum', 'sudah'].forEach((k) => tabs[k].classList.toggle('on', k === st));
    sub.textContent = SUB[st];
    const [r, nb, ns] = await Promise.all([
      filt(supabase.from('laporan').select('*', { count: 'exact' })).order(st === 'belum' ? C.tanggal : 'ditindak_pada', { ascending: urut === 'lama' }).range(p * PER, p * PER + PER - 1),
      supabase.from('laporan').select('id', { count: 'exact', head: true }).eq('status', 'belum'), supabase.from('laporan').select('id', { count: 'exact', head: true }).eq('status', 'sudah')]);
    bd.belum.textContent = String(nb.count ?? 0); bd.sudah.textContent = String(ns.count ?? 0);
    if (!r.error) r.data = normAll(r.data);
    const sd = st === 'sudah', body = h('div', 'tw'), pg = h('div', 'pg tc-f');
    const th = ['Nama (Terdampak/Pelaku)', 'Kategori Isu', 'Tanggal Masuk', 'Berkaitan', 'Lokasi', 'Status', 'Aksi'];
    if (r.error) kosong(body, 'Gagal memuat data.');
    else if (!r.data.length) kosongTabel(body, th, 'Belum ada laporan', PER);
    else body.append(h('table', 't2', [h('thead', '', [h('tr', '', th.map((x) => h('th', '', x)))]), h('tbody', '', r.data.map((l) => h('tr', '', [
      h('td', 'dt', namaSiswa(l)[1] || '–'), h('td', '', [badgeKat(l.kategori)]),
      h('td', 'dt', [tgl(l.dibuat_pada), h('small', '', jam(l.dibuat_pada) + ' WITA')]),
      h('td', 'dt', PEL[l.pelapor]), h('td', 'mut', l.lokasi || '–'),
      h('td', '', [statusPil(l.status)]),
      h('td', '', [sd ? h('a', 'btn2 line', ['Lihat Catatan', ik('filetext')], { href: `/admin/form-tindak-lanjut.html?id=${encodeURIComponent(l.id)}&mode=lihat` }) : h('a', 'btn2 olive', ['Tindak Lanjuti', ik('arrow')], { href: `/admin/form-tindak-lanjut.html?id=${encodeURIComponent(l.id)}` })])])))]));
    if (!r.error && r.data.length) pager(pg, r.count, p, PER, (n) => { p = n; muat(); });
    const tot = sd ? ns.count ?? 0 : nb.count ?? 0;
    card.replaceChildren(
      h('div', 'tc-h', [h('div', '', [h('h2', '', [ik(sd ? 'checkcircle' : 'clipclock'), sd ? 'LAPORAN SUDAH DITINDAKLANJUTI' : 'LAPORAN BELUM DITINDAKLANJUTI']), h('span', 'chip sm', sd ? `${tot} Laporan Tuntas Ditangani` : `${tot} Laporan Menunggu Tindakan`)]),
        h('div', 'sels', [h('label', 'fi', [fk]), h('label', 'fi', [ik('calendar'), fm]), h('label', 'fi', [fo])])]), body, pg);
    card.classList.remove('skl-busy');
  }
  fo.addEventListener('change', () => { urut = fo.value; p = 0; muat(); });
  [fk, fm].forEach((x) => x.addEventListener('change', () => { p = 0; muat(); }));
  muat();
}

async function formTindak() {
  const staf = await requireStaff(); if (!staf) return;
  const root = document.getElementById('form-root');
  const q = new URLSearchParams(location.search), id = q.get('id'), lihat = q.get('mode') === 'lihat';
  const { data: lMentah } = id ? await supabase.from('laporan').select('*').eq('id', id).maybeSingle() : { data: null };
  const l = norm(lMentah);
  if (!l) { kosong(root, 'Laporan tidak ditemukan.'); return; }
  const att = await lampiran(l.gambar);
  const ub = (lb, v, ic, c, full) => h('div', 'ub cr' + (full ? ' full' : ''), [h('div', '', [lb, h('b', c || '', [v])]), ik(ic)]);
  const nama = el('input', { class: 'in2', id: 'nama', maxlength: '200', value: l.ditindak_nama || staf.nama || '' });
  const jab = el('input', { class: 'in2', id: 'jab', maxlength: '200', placeholder: 'Guru SMA Muhammadiyah 2 / Wali Kelas', value: l.ditindak_jabatan || '' });
  const cat = el('textarea', { class: 'in2', id: 'cat', maxlength: '1200' }); cat.value = l.catatan || '';
  const cn = h('div', 'cnt'), upd = () => { cn.textContent = `${cat.value.length} / 1200 karakter`; }; cat.addEventListener('input', upd); upd();
  const er = () => h('div', 'er', '', { role: 'alert' }), e1 = er(), e2 = er(), e3 = er();
  let cur = l.status;
  const rad = (v, t, s, ic) => {
    const inp = el('input', { type: 'radio', name: 'status', value: v, class: 'sr-only' }); inp.checked = v === cur;
    const lb = h('label', 'rad' + (v === cur ? ' on' : '') + (lihat ? ' off' : ''), [inp, h('span', 'rad-c', [ik('check')]), h('div', '', [h('b', '', [t, ik(ic)]), h('small', '', s)])]);
    inp.disabled = lihat; inp.addEventListener('change', () => { cur = v; radios.forEach((r) => r.classList.toggle('on', r === lb)); });
    return lb;
  };
  const radios = [rad('belum', 'Belum Ditindaklanjuti', 'Investigasi berjalan / pemantauan awal', 'hourglass'), rad('sudah', 'Sudah Ditindaklanjuti', 'Kasus tuntas / mediasi selesai', 'checkcircle')];
  const fld = (lb, inp, e) => h('div', '', [h('div', 'fl', [h('label', '', lb, { for: inp.id }), h('span', 'chip', 'Wajib Diisi')]), inp, e]);
  if (lihat) [nama, jab, cat].forEach((x) => x.setAttribute('readonly', ''));
  const batal = h('a', 'btn2', lihat ? 'Kembali' : 'Batal', { href: '/admin/tindak-lanjut.html' });
  const simpan = h('button', 'btn2 main', [ik('checkcircle'), 'Simpan & Perbarui Tindak Lanjut'], { type: 'submit' });
  const form = h('form', 'fcard', [
    h('div', 'fh', [h('span', 'ibox d', [ik('clipcheck')]), h('div', '', [h('h2', '', 'Identitas Form Tindak Lanjut'), h('p', '', 'Lengkapi evaluasi penanganan internal demi menjamin akuntabilitas layanan konseling.')])]),
    h('section', 'blk', [h('h3', '', [h('i', '', '1'), 'Nama Petugas Penanggung Jawab']), h('div', 'tg', [fld('Nama Petugas yang Menindaklanjuti', nama, e1), fld('Jabatan / Peran', jab, e2)])]),
    h('section', 'blk', [h('h3', '', [h('i', '', '2'), 'Catatan Internal Laporan Tindak Lanjut']), h('p', '', 'Catatan ini hanya dapat dilihat oleh admin dan petugas, tidak ditampilkan kepada siswa pelapor maupun pihak eksternal.', { class: 'fh-p' }), cat, e3, cn]),
    h('section', 'blk', [h('h3', '', [h('i', '', '3'), 'Status Penanganan Laporan']), h('p', '', 'Pilih status definitif terkini atas penyelesaian kasus ini:'), h('div', 'rads', radios)]),
    h('div', 'acts', lihat ? [batal] : [batal, simpan])], { novalidate: '' });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = nama.value.trim(), j = jab.value.trim(), c = cat.value.trim();
    e1.textContent = n ? '' : 'Nama petugas wajib diisi.'; e2.textContent = j ? '' : 'Jabatan wajib diisi.'; e3.textContent = c ? '' : 'Catatan wajib diisi.';
    if (!n || !j || !c) return;
    simpan.disabled = true;
    const { error } = await supabase.from('laporan').update({ status: cur, catatan: c.slice(0, 1200), ditindak_oleh: staf.user.id, ditindak_nama: n.slice(0, 200), ditindak_jabatan: j.slice(0, 200), ditindak_pada: cur === 'sudah' ? new Date().toISOString() : null }).eq('id', id);
    if (error) { simpan.disabled = false; e3.textContent = 'Gagal menyimpan. Coba lagi.'; return; }
    sessionStorage.setItem('samara_toast', 'Tindak lanjut berhasil disimpan.');
    location.href = '/admin/tindak-lanjut.html';
  });
  root.className = 'fm-wrap';
  root.replaceChildren(
    h('div', 'banner bn-row', [h('a', 'back', [ik('arrowleft')], { href: '/admin/tindak-lanjut.html', 'aria-label': 'Kembali' }), h('h1', 'adm-h1', 'Form Tindak Lanjut Laporan')]),
    h('section', 'fcard', [
      h('div', 'fh', [h('span', 'ibox', [ik('filetext')]), h('div', '', [h('h2', '', 'Laporan Siswa'), h('p', '', 'Data asli yang disampaikan melalui platform pelaporan SAMARA MindCare.')]), h('span', 'chip', [ik('lock')])]),
      h('div', 'tg', [ub(namaSiswa(l)[0], namaSiswa(l)[1] || '–', 'user'), ub('Subjek Terkait', PEL[l.pelapor], 'users'), ub('Kategori Isu', FULL[l.kategori], 'tri', 'c1', true), ub('Waktu Kejadian', l.waktu || '–', 'alarm'), ub('Bentuk Keluhan / Perilaku', l.bentuk, 'alert'), ...(l.kategori === 'mental' ? [ub('Situasi / Kondisi Pemicu', l.pemicu || '–', 'activity', '', true)] : [])]),
      h('div', 'sec', [ik('msg'), 'Deskripsi Lengkap Kejadian dari Siswa']), h('div', 'qb', [h('p', '', `“${l.isi}”`)]),
      att.length ? h('div', 'sec', [ik('clip'), `Bukti Gambar & Lampiran (${att.length} Berkas)`]) : null, att.length ? h('div', 'ag', att) : null]),
    h('section', '', [form]));
}

if (page === 'tindak') daftar(); else if (page === 'form-tindak') formTindak();