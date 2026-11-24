// Logika halaman layanan: pilih kategori, form dinamis, validasi, reCAPTCHA, unggah, kirim.
import { icon, hydrateIcons } from './ui.js';
import { supabase } from './supabase-client.js';
import { validasiFile, kompres, unggah, MAX_FILES } from './upload.js';
import { el } from './aman.js';

const MAX_CHAR = 1200;
const COOLDOWN_MS = 60_000; // pembatasan frekuensi sisi klien (server membatasi juga)

const PRIVASI = 'Laporanmu dijaga kerahasiaannya dan hanya dibaca oleh guru SMA Muhammadiyah 2 yang bertugas. Sampaikan informasi seperlunya sesuai dengan kenyamananmu. Tidak ada riwayat IP, perangkat, ataupun nomor kontak yang disimpan ke dalam sistem kami.';

// Konfigurasi tiap kategori - teks mengikuti desain
const KATEGORI = {
  mental: {
    key: 'mental', formBtn: 'Form Kesehatan Mental', judul: 'Formulir Kesehatan Mental',
    nama: 'Kesehatan Mental & Beban Pikiran',
    sub: 'Ruang aman dan hening untuk mencurahkan beban emosional, kecemasan ujian, atau tekanan pikiran secara rahasia.',
    wajibNama: ['nama_terdampak', 'Nama siswa yang terdampak', 'Tuliskan nama lengkap siswa yang terdampak'],
    tanya: 'Siapa yang mengalami kondisi ini?',
    opsi: [['diri_sendiri', 'Diri sendiri', 'user'], ['siswa_lain', 'Siswa lain (Teman sekelas/sekolah)'], ['disaksikan', 'Kejadian disaksikan / diketahui']],
    dropLabel: 'Bentuk keluhan / kondisi utama yang dirasakan',
    drop: ['Kecemasan berlebih / stres akademik mendalam', 'Kelelahan emosional / kejenuhan belajar ekstrem', 'Rasa terisolasi / kesepian', 'Sulit tidur / pikiran tidak tenang', 'Lainnya'],
    in1: ['Perkiraan durasi yang dirasakan', 'clock', 'Contoh: Baru beberapa hari terakhir / lebih dari 2 pekan', 'durasi'],
    in2: ['Situasi / kondisi pemicu', 'navigation', 'Contoh: Saat persiapan ujian di kelas / saat berinteraksi sosial', 'pemicu'],
    taLabel: 'Ceritakan yang sedang kamu rasakan', chip: 'Bebas Penghakiman',
    taPh: 'Tuliskan apa yang berkecamuk di pikiran atau perasaanmu. Ceritakan dengan santai tanpa rasa takut dinilai, guru SMA Muhammadiyah 2 siap membaca dengan empati...',
    tips: 'Tulislah sesuai apa yang kamu rasakan senyamannya. Tidak perlu takut salah merangkai kata.',
    kirim: 'Kirim Curahan Hati Terenkripsi',
  },
  bullying: {
    key: 'bullying', formBtn: 'Form Bullying', judul: 'Formulir Penyampaian Rahasia',
    nama: 'Bullying', sub: '',
    wajibNama: ['nama_terdampak', 'Nama siswa yang terdampak', 'Tuliskan nama lengkap siswa yang terdampak'],
    tanya: 'Siapa yang mengalami kejadian ini?',
    opsi: [['diri_sendiri', 'Diri sendiri'], ['siswa_lain', 'Siswa lain (Teman sekelas/sekolah)', 'user'], ['disaksikan', 'Kejadian disaksikan / diketahui']],
    defaultOpsi: 'siswa_lain',
    dropLabel: 'Bentuk perundungan yang paling mendekati situasi',
    drop: ['Intimidasi verbal / ejekan berulang / panggilan merendahkan', 'Kekerasan fisik / pemalakan', 'Pengucilan kelompok', 'Perundungan siber / media sosial', 'Pemerasan', 'Lainnya'],
    in1: ['Waktu kejadian', 'clock', 'Contoh: Istirahat jam kedua / beberapa hari terakhir', 'waktu'],
    in2: ['Lokasi kejadian', 'navigation', 'Contoh: Area belakang kantin / lorong lantai 2', 'lokasi'],
    taLabel: 'Deskripsi Kejadian', chip: 'Kerahasiaan Terjaga',
    taPh: 'Ceritakan apa yang terjadi secara ringkas dan objektif tanpa perlu memberikan identitas pribadimu jika belum berkenan. Tuliskan konteks yang perlu diketahui guru SMA Muhammadiyah 2...',
    tips: 'Hindari mencantumkan nomor kontak pribadi dan tuliskan informasi seperlunya saja.',
    kirim: 'Kirim Laporan',
  },
  rokok: {
    key: 'rokok', formBtn: 'Form Rokok & Vape', judul: 'Formulir Aduan Pencegahan Rokok & Vape',
    nama: 'Rokok & Vape',
    sub: 'Bantu ciptakan lingkungan belajar SMA Muhammadiyah 2 Samarinda yang bersih, sehat, dan bebas asap rokok maupun rokok elektrik.',
    wajibNama: ['nama_pelaku', 'Nama siswa sebagai pelaku', 'Tuliskan nama lengkap siswa sebagai pelaku'],
    tanya: 'Siapa yang mengalami kejadian ini?',
    opsi: [['disaksikan', 'Kejadian disaksikan / diketahui', 'eye'], ['siswa_lain', 'Siswa lain (Teman sekolah)'], ['diri_sendiri', 'Diri sendiri (Ingin konsultasi berhenti)']],
    dropLabel: 'Bentuk aktivitas / indikasi yang teramati',
    drop: ['Menghisap rokok elektrik / vape di area sekolah', 'Merokok konvensional di area sekolah', 'Membawa / menyimpan rokok atau vape', 'Menjual / mengedarkan rokok atau vape', 'Ingin konsultasi berhenti merokok', 'Lainnya'],
    in1: ['Waktu kejadian', 'clock', 'Contoh: Jam istirahat pertama (10:00 WITA)', 'waktu'],
    in2: ['Lokasi kejadian spesifik', 'navigation', 'Contoh: Toilet lantai 2 sayap timur / Belakang kantin / Area parkir', 'lokasi'],
    taLabel: 'Deskripsi Kejadian', chip: 'Kerahasiaan Terjaga',
    taPh: 'Jelaskan situasi yang teramati secara ringkas dan objektif demi pembinaan terarah tanpa hukuman fisik...',
    tips: 'Hindari mencantumkan nomor kontak pribadi dan tuliskan informasi seperlunya saja.',
    kirim: 'Kirim Laporan Terenkripsi',
  },
};
KATEGORI.bullying.judulKategori = 'Bullying';

// Pilihan lokasi kejadian (dropdown). "Lainnya" memunculkan kolom isian bebas.
const LOKASI = ['Ruang kelas', 'Lorong / koridor', 'Kantin', 'Toilet', 'Lapangan / halaman sekolah', 'Area parkir', 'Masjid / mushola', 'Perpustakaan', 'Laboratorium', 'Area belakang sekolah / sudut sepi', 'Di luar sekolah (jalan / angkutan)', 'Media sosial / daring'];
const LAINNYA = '__lainnya';

const state = { kat: null, files: [], captchaToken: null, widgetId: null, captchaWaiter: null };
const $ = (s, r = document) => r.querySelector(s);
const ikon = (n) => `<i data-ic="${n}"></i>`;

// ----- Kartu kategori -----
function pilih(key, blok) {
  state.kat = KATEGORI[key];
  state.files = [];
  state.captchaToken = null;
  document.querySelectorAll('.cat-card').forEach((c) => {
    const aktif = c.dataset.kat === key;
    c.classList.toggle('selected', aktif);
    const b = c.querySelector('.pick-btn');
    b.innerHTML = aktif ? `Aktif Mengisi ${KATEGORI[key].formBtn} ${icon('check')}` : 'Pilih Kategori Ini';
    b.setAttribute('aria-pressed', String(aktif));
  });
  // chip ketiga hanya saat kategori Rokok & Vape
  $('#chip-guru').hidden = key !== 'rokok';
  tampilkanForm(blok);
}

// ----- Form -----
function tampilkanForm(blok = 'nearest') {
  const k = state.kat;
  const area = $('#form-area');
  $('#sukses-area').hidden = true;
  area.hidden = false;
  const namaKat = k.key === 'bullying' ? 'Bullying' : k.nama;
  const defOpsi = k.defaultOpsi || k.opsi[0][0];
  const radios = k.opsi.map(([v, t, ic]) => `<label class="radio-pill"><input type="radio" name="pelapor" value="${v}" ${v === defOpsi ? 'checked' : ''}><span class="txt">${v === defOpsi && ic ? ikon(ic) : ''}${t}</span><span class="rb"></span></label>`).join('');
  const opts = k.drop.map((d) => `<option>${d}</option>`).join('');
  const [wId, wLbl, wPh] = k.wajibNama;
  const wajib = `<div class="field"><div class="lbl-row"><label for="f-${wId}">${wLbl} <span class="req">*</span></label></div><div class="input-wrap">${ikon('user')}<input class="input" id="f-${wId}" name="${wId}" maxlength="200" placeholder="${wPh}" autocomplete="off" aria-describedby="err-nama" required></div><p class="error-msg" id="err-nama" role="alert" hidden></p></div>`;
  const inp = ([lbl, ic, ph, id]) => `<div class="field"><div class="lbl-row"><label for="f-${id}">${lbl}</label><span class="opt">Opsional</span></div><div class="input-wrap">${ikon(ic)}<input class="input" id="f-${id}" name="${id}" maxlength="200" placeholder="${ph}"></div></div>`;
  const lokasi = ([lbl]) => `<div class="field"><div class="lbl-row"><label for="f-lokasi">${lbl}</label><span class="opt">Opsional</span></div><div class="select-wrap"><select class="select" id="f-lokasi" name="lokasi"><option value="">Pilih lokasi kejadian</option>${LOKASI.map((l) => `<option>${l}</option>`).join('')}<option value="${LAINNYA}">Lainnya</option></select>${ikon('down')}</div><div class="input-wrap lokasi-lain" id="lokasi-lain-wrap" hidden>${ikon('navigation')}<input class="input" id="f-lokasi-lain" name="lokasi_lain" maxlength="200" placeholder="Tuliskan lokasi kejadian secara singkat" autocomplete="off" aria-label="Lokasi kejadian lainnya"></div><p class="error-msg" id="err-lokasi" role="alert" hidden></p></div>`;
  const adaLokasiDiKolom2 = k.in2[3] === 'lokasi';
  const barisInput = adaLokasiDiKolom2
    ? `<div class="two-col">${inp(k.in1)}${lokasi(k.in2)}</div>`
    : `<div class="two-col">${inp(k.in1)}${inp(k.in2)}</div>${lokasi(['Lokasi kejadian'])}`;
  area.innerHTML = `<form class="form-panel" id="form-lapor" novalidate>
    <div class="form-head"><div><h2>${k.judul} <small>(Kategori: ${namaKat})</small></h2>${k.sub ? `<p class="sub">${k.sub}</p>` : ''}</div>
      <div class="chip-row"><span class="chip-sm">${ikon('lock')} Terenkripsi Satu Arah</span></div></div>
    <div class="privacy-box">${ikon('shieldcheck')}<p><strong>Jaminan Privasi Penuh:</strong> ${PRIVASI}</p></div>
    <fieldset class="field" style="border:0;padding:0;margin:0 0 22px"><div class="lbl-row"><legend class="lbl" style="padding:0;margin:0">${k.tanya}</legend><span class="hint-r">Pilih salah satu</span></div><div class="radios">${radios}</div></fieldset>
    ${wajib}
    <div class="field"><label for="f-bentuk">${k.dropLabel}</label><div class="select-wrap"><select class="select" id="f-bentuk" name="bentuk">${opts}</select>${ikon('down')}</div></div>
    ${barisInput}
    <div class="field"><div class="lbl-row"><label for="f-isi">${k.taLabel} <span class="req">*</span></label><span class="meta-r"><span class="chip-sm">${k.chip}</span><span class="counter" id="counter">0 / ${MAX_CHAR} karakter</span></span></div>
      <textarea class="textarea" id="f-isi" name="isi" maxlength="${MAX_CHAR}" placeholder="${k.taPh}" aria-describedby="err-isi"></textarea>
      <p class="error-msg" id="err-isi" role="alert" hidden></p>
      <p class="tip">${ikon('bulb')}<span><strong>Tips:</strong> ${k.tips}</span></p></div>
    <div class="upload-box"><div class="upload-head"><div><h3>${ikon('image')} Unggah Gambar yang Menunjukkan Kondisi Kamu</h3><p>Gambar boleh berupa apa saja yang menggambarkan perasaanmu, misalnya coretan, foto suasana hening, atau ilustrasi. Kamu tidak harus mengunggahnya.</p></div>
      <div class="chips"><span class="chip-sm neutral">Opsional</span><span class="chip-sm solid" id="jml">0 / ${MAX_FILES} gambar</span></div></div>
      <div class="dropzone" id="dz"><span class="icon-box">${ikon('image')}</span><strong>Tambahkan Gambar</strong><button type="button" class="btn-pill-sm" id="pilih-file">Pilih File</button>
        <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp" multiple hidden></div>
      <div class="previews" id="previews"></div>
      <p class="error-msg" id="err-file" role="alert" hidden></p>
      <div class="upload-foot"><span>${ikon('info')} Format yang didukung:&nbsp; JPG, PNG, WEBP</span><span>Maksimal ${MAX_FILES} file</span></div></div>
    <div class="safety-box"><span class="icon-box">${ikon('info')}</span><div><h4>Penting untuk Keselamatan (Non-Darurat)</h4><p>SAMARA bukan layanan darurat dan tidak dipantau secara real-time. Jika kamu atau temanmu berada dalam bahaya langsung atau membutuhkan penanganan mendesak, segera cari bantuan langsung dari guru, petugas sekolah, atau orang dewasa tepercaya di sekitarmu.</p></div></div>
    <div id="recaptcha-box" class="captcha-box"></div>
    <p class="error-msg" id="err-form" role="alert" hidden></p>
    <div class="send-status" id="send-status" role="status" aria-live="polite" hidden><span class="spin" aria-hidden="true"></span><span id="send-status-txt">Mengirim laporan...</span></div>
    <div class="form-foot"><span class="note">${ikon('lock')} Curahan terenkripsi langsung ke guru SMA Muhammadiyah 2</span>
      <button class="btn btn-green" type="submit" id="btn-kirim">${k.kirim} ${icon('arrow')}</button></div>
  </form>`;
  hydrateIcons(area);
  pasangEvent();
  muatRecaptcha();
  area.scrollIntoView({ behavior: 'smooth', block: blok });
}

function pasangEvent() {
  const ta = $('#f-isi');
  ta.addEventListener('input', () => {
    $('#counter').textContent = `${ta.value.length} / ${MAX_CHAR} karakter`;
    if (ta.value.trim()) setErr('err-isi', '', ta);
  });
  const wn = $('#form-lapor').elements[state.kat.wajibNama[0]];
  wn.addEventListener('input', () => { if (wn.value.trim()) setErr('err-nama', '', wn); });
  const sel = $('#f-lokasi'), lw = $('#lokasi-lain-wrap'), li = $('#f-lokasi-lain');
  sel.addEventListener('change', () => {
    const lain = sel.value === LAINNYA;
    lw.hidden = !lain;
    if (lain) li.focus(); else { li.value = ''; setErr('err-lokasi', '', li); }
  });
  li.addEventListener('input', () => { if (li.value.trim()) setErr('err-lokasi', '', li); });
  const fi = $('#file-input');
  $('#pilih-file').addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => { tambahFile([...fi.files]); fi.value = ''; });
  const dz = $('#dz');
  ['dragenter', 'dragover'].forEach((e) => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((e) => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (ev) => tambahFile([...ev.dataTransfer.files]));
  $('#form-lapor').addEventListener('submit', kirim);
}

function setErr(id, msg, input) {
  const p = $('#' + id);
  p.textContent = msg;
  p.hidden = !msg;
  if (input) input.classList.toggle('invalid', !!msg);
}

// ----- Gambar -----
async function tambahFile(list) {
  setErr('err-file', '');
  for (const f of list) {
    if (state.files.length >= MAX_FILES) { setErr('err-file', `Maksimal ${MAX_FILES} gambar.`); break; }
    const e = validasiFile(f);
    if (e) { setErr('err-file', e); continue; }
    try {
      const { blob, ext } = await kompres(f);
      state.files.push({ blob, ext, url: URL.createObjectURL(blob) });
    } catch { setErr('err-file', 'Gambar tidak dapat diproses. Coba file lain.'); }
  }
  renderPreview();
}
function renderPreview() {
  const box = $('#previews');
  box.replaceChildren(...state.files.map((f, i) => el('div', { class: 'pv' }, [
    el('img', { src: f.url, alt: `Pratinjau gambar ${i + 1}` }),
    el('button', { type: 'button', 'aria-label': 'Hapus gambar', text: '×', onclick: () => { URL.revokeObjectURL(f.url); state.files.splice(i, 1); renderPreview(); } }),
  ])));
  $('#jml').textContent = `${state.files.length} / ${MAX_FILES} gambar`;
}

// ----- Google reCAPTCHA v2 (kotak centang "Saya bukan robot") -----
// Kotak tampil di atas tombol kirim. Tantangan pilih gambar muncul otomatis bila Google menilai perlu.
function muatRecaptcha() {
  const site = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!site) { console.error('[SAMARA] VITE_RECAPTCHA_SITE_KEY kosong. Isi di .env (lokal) atau Netlify (Environment variables) lalu restart/build ulang.'); return; }
  const render = () => {
    const box = $('#recaptcha-box');
    if (!box || !window.grecaptcha || !window.grecaptcha.render) return;
    state.captchaToken = null;
    box.replaceChildren();
    state.widgetId = window.grecaptcha.render(box, {
      sitekey: site,
      callback: (t) => { state.captchaToken = t; setErr('err-form', ''); },
      'expired-callback': () => { state.captchaToken = null; },
      'error-callback': () => { state.captchaToken = null; },
    });
  };
  // api.js dimuat sekali; jika sudah ada, render saja (form dibuat ulang saat ganti kategori)
  if (window.grecaptcha && window.grecaptcha.render) return window.grecaptcha.ready(render);
  window.onRecaptchaReady = () => window.grecaptcha.ready(render);
  if (document.getElementById('rc-script')) return;
  const s = document.createElement('script');
  s.id = 'rc-script';
  s.src = 'https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaReady&hl=id';
  s.async = true;
  s.defer = true;
  s.onerror = () => console.error('[SAMARA] Skrip reCAPTCHA gagal dimuat (cek CSP di netlify.toml / koneksi / ad-blocker).');
  document.head.append(s);
}

// ----- Kirim -----
// Ambil rincian galat dari Edge Function (status HTTP + kode) supaya mudah didiagnosis di konsol.
async function bacaGalat(err) {
  const out = { pesan: err?.message || String(err), status: null, kode: null, badan: null };
  try {
    const r = err?.context;
    if (r && typeof r.json === 'function') {
      out.status = r.status;
      out.badan = await r.clone().json().catch(() => null);
      out.kode = out.badan?.kode || null;
    }
  } catch { /* abaikan */ }
  return out;
}

async function kirim(ev) {
  ev.preventDefault();
  setErr('err-form', '');
  const f = ev.target;
  const [wId, wLbl] = state.kat.wajibNama;
  const wNama = f.elements[wId].value.trim();
  if (!wNama) { setErr('err-nama', `${wLbl} wajib diisi.`, f.elements[wId]); f.elements[wId].focus(); return; }
  const isi = f.isi.value.trim();
  if (!isi) { setErr('err-isi', 'Mohon isi ceritamu dulu ya, bagian ini wajib diisi.', f.isi); f.isi.focus(); return; }
  if (isi.length > MAX_CHAR) { setErr('err-isi', `Maksimal ${MAX_CHAR} karakter.`, f.isi); return; }
  const lokasiLain = f.lokasi_lain?.value.trim() || '';
  if (f.lokasi.value === LAINNYA && !lokasiLain) { setErr('err-lokasi', 'Mohon tuliskan lokasi kejadiannya, atau pilih salah satu lokasi di atas.', f.lokasi_lain); f.lokasi_lain.focus(); return; }
  const last = Number(sessionStorage.getItem('samara_last') || 0);
  if (Date.now() - last < COOLDOWN_MS) { setErr('err-form', 'Laporan baru saja terkirim. Mohon tunggu sebentar sebelum mengirim lagi.'); return; }
  if (!state.captchaToken) { setErr('err-form', 'Mohon centang "Saya bukan robot" terlebih dahulu.'); return; }

  const btn = $('#btn-kirim');
  const labelAwal = btn.innerHTML;
  const status = $('#send-status'), statusTxt = $('#send-status-txt');
  // Tanda loading: tombol dikunci + teks "Mengirim laporan..." supaya pengguna tahu laporan sedang diproses
  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Mengirim laporan...';
  status.hidden = false;
  statusTxt.textContent = state.files.length ? 'Mengunggah gambar dan mengirim laporan... mohon jangan tutup halaman ini.' : 'Mengirim laporan... mohon jangan tutup halaman ini.';
  const selesaiLoading = () => {
    btn.disabled = false; btn.classList.remove('btn-loading'); btn.removeAttribute('aria-busy');
    btn.innerHTML = labelAwal; hydrateIcons(btn); status.hidden = true;
  };
  try {
    const paths = [];
    for (const g of state.files) paths.push(await unggah(g.blob, g.ext));
    const payload = {
      kategori: state.kat.key,
      pelapor: f.pelapor.value,
      bentuk: f.bentuk.value,
      waktu: f.waktu?.value.trim() || null,
      lokasi: (f.lokasi.value === LAINNYA ? lokasiLain : f.lokasi.value.trim()) || null,
      durasi: f.durasi?.value.trim() || null,
      pemicu: f.pemicu?.value.trim() || null,
      [wId]: wNama,
      isi, gambar: paths, token: state.captchaToken,
    };
    // Edge Function memeriksa reCAPTCHA + pembatasan global, lalu menyimpan data
    const { data, error } = await supabase.functions.invoke('kirim-laporan', { body: payload });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    sessionStorage.setItem('samara_last', String(Date.now()));
    state.files.forEach((g) => URL.revokeObjectURL(g.url));
    tampilSukses();
  } catch (err) {
    // Rincian teknis hanya ke konsol (F12) untuk diagnosis; siswa tetap melihat pesan ramah.
    const detail = await bacaGalat(err);
    console.error('[SAMARA] Gagal mengirim laporan:', detail);
    setErr('err-form', detail.kode === 'captcha'
      ? 'Verifikasi keamanan belum valid atau sudah kedaluwarsa. Silakan centang ulang verifikasi lalu kirim lagi.'
      : 'Maaf, laporan belum berhasil terkirim. Silakan coba lagi sebentar lagi.');
    if (window.grecaptcha && state.widgetId != null) { window.grecaptcha.reset(state.widgetId); }
    state.captchaToken = null;
    selesaiLoading();
  }
}

function tampilSukses() {
  $('#form-area').hidden = true;
  $('#form-area').replaceChildren();
  $('#sukses-area').hidden = false;
  document.querySelectorAll('.cat-card').forEach((c) => {
    c.classList.remove('selected');
    c.querySelector('.pick-btn').textContent = 'Pilih Kategori Ini';
  });
  $('#chip-guru').hidden = true;
  $('#sukses-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.querySelectorAll('.cat-card .pick-btn').forEach((b) =>
  b.addEventListener('click', () => pilih(b.closest('.cat-card').dataset.kat)));

// Dukungan tautan langsung: layanan.html?kat=mental|bullying|rokok
const q = new URLSearchParams(location.search).get('kat');
if (q && KATEGORI[q]) pilih(q, 'start');