// Halaman Pusat Informasi: tiga topik dirender dari data statis tanpa reload.
// Semua teks dimasukkan lewat el()/textContent (aman.js), bukan innerHTML.
import './ui.js';
import '../css/informasi.css';
import { icon } from './ui.js';
import { el } from './aman.js';

// Ikon statis -> elemen SVG
const ik = (n) => { const t = document.createElement('template'); t.innerHTML = icon(n); return t.content.firstChild; };
// Teks kaya: string biasa, ['i', teks] = miring, ['b', teks] = tebal hijau
const rich = (parts) => [].concat(parts).map((p) => (Array.isArray(p) ? el(p[0] === 'i' ? 'em' : 'b', p[0] === 'b' ? { class: 'lead' } : {}, p[1]) : p));
// Foto dengan latar gradien sebagai cadangan bila berkas belum ada
const foto = (src, alt) => { const i = el('img', { src, alt, loading: 'lazy' }); i.addEventListener('error', () => i.remove()); return i; };

const CATATAN = 'Materi ini bersifat edukasi dan bukan pengganti konsultasi langsung dengan guru atau tenaga profesional kesehatan mental sekolah.';

// ===== Blok bersama =====
function panelSpiritual({ arab, arti, ref, kartu, kutip, pil, pilBesar }) {
  const gelombang = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  gelombang.setAttribute('class', 'wave'); gelombang.setAttribute('viewBox', '0 0 800 160'); gelombang.setAttribute('preserveAspectRatio', 'none'); gelombang.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M0 70 C140 10 260 130 420 70 S690 20 800 80 V160 H0 Z'); path.setAttribute('fill', '#fff');
  gelombang.append(path);
  return el('section', { class: 'spirit', 'aria-label': 'Landasan spiritual' }, [
    gelombang, el('span', { class: 'circle', 'aria-hidden': 'true' }),
    el('div', { class: 'spirit-top' }, [el('span', { class: 'tag', text: 'LANDASAN SPIRITUAL' }), el('span', { class: 'r' }, [ik('book'), 'Perspektif Islam & Nilai Kemuhammadiyahan'])]),
    el('p', { class: 'arab', dir: 'rtl', lang: 'ar', text: arab }),
    el('p', { class: 'arti' }, [arti]),
    el('span', { class: 'ref', text: ref }),
    kartu ? el('div', { class: 'spirit-cards' }, kartu) : null,
    kutip ? el('p', { class: 'spirit-quote', text: kutip }) : null,
    pil ? el('div', { class: 'pill-quote' }, [pil]) : null,
  ]);
}
const scard = (judul, isi, kecil, opsi = {}) => el('div', { class: 'scard' + (opsi.polos ? ' plain' : '') }, [
  el('div', { class: 't' + (opsi.besar ? ' big' : '') }, [ik('book'), judul]), el('p', { text: isi }), kecil ? el('small', { text: kecil }) : null,
]);
const tipsHead = (judul, sub, chip, bulat) => el('div', { class: 'tips-head' + (bulat ? ' round' : '') }, [
  el('span', { class: 'icon-box' }, [ik(bulat ? 'checkcircle' : 'bulb')]),
  el('div', {}, [el('h2', { text: judul }), sub ? el('p', { text: sub }) : null]),
  chip ? el('span', { class: 'count-chip', text: chip }) : null,
]);
// kat: kunci kategori layanan (mental | bullying | rokok) -> layanan.html?kat=<kat> membuka formulir yang sesuai
const catatanCta = (kat) => [
  el('div', { class: 'note-pill' }, [ik('info'), el('span', {}, [el('b', { text: 'Catatan Penting: ' }), CATATAN])]),
  el('div', { class: 'cta-row' }, [el('a', { class: 'btn btn-orange btn-sm', href: `/layanan.html?kat=${kat}` }, [ik('megaphone'), 'Sampaikan Laporan'])]),
];

// ===== Topik 1: Kesehatan Mental =====
function modKesehatan() {
  const poin = (no, ikon, isi, kelas, label) => el('article', { class: 'poin ' + (kelas || '') }, [
    el('div', { class: 'top' }, [el('span', { class: 'icon-box' }, [ik(ikon)]), label || `POIN ${no}`]), el('p', { text: isi })]);
  const tips = [
    'Atur jadwal belajar seimbang dan sediakan waktu istirahat teratur.',
    'Penuhi kebutuhan tidur yang cukup (7–8 jam per malam).',
    'Lakukan latihan napas dalam secara rutin (tarik napas perlahan 4 detik, tahan 7 detik, lalu hembuskan lembut 8 detik).',
    'Bercerita secara terbuka kepada teman sebaya, keluarga, atau guru SMA Muhammadiyah 2 yang dipercaya.',
    'Kurangi kebiasaan membandingkan pencapaian diri dengan orang lain di media sosial.',
    'Perbanyak dzikir, doa, dan tilawah untuk menenangkan kalbu.',
  ];
  return [
    el('div', { class: 'mod-head' }, [
      el('div', {}, [
        el('span', { class: 'mod-label chip-lbl', text: 'MODUL 01 • PENJAGAAN KALBU & PIKIRAN' }),
        el('h1', { text: 'Kesehatan Mental & Perawatan Diri Remaja' }),
        el('p', { class: 'mod-quote', text: '“Menjaga perasaan sama pentingnya dengan menjaga tubuh.”' }),
      ]),
      el('div', { class: 'photo-card sm' }, [foto('public/img/kesehatan mental.png', 'Siswi membaca di bawah pohon'), el('span', { class: 'cap', text: 'Healthy Mind, Bright Future' })]),
    ]),
    el('div', { class: 'sub-head' }, [el('span', { class: 'ic-circle' }, [ik('bulb')]), el('h2', { text: 'Edukasi Dasar' })]),
    el('div', { class: 'poin-grid' }, [
      poin('01', 'mind', 'Kesehatan mental adalah kondisi saat kita mampu mengelola perasaan, berpikir jernih, dan menjalani aktivitas sehari-hari.'),
      poin('02', 'activity', 'Stres adalah respons alami tubuh terhadap tekanan, seperti tugas dan ujian. Wajar dialami, tetapi perlu dikelola dengan bijak.'),
      poin('03', 'heart', 'Kecemasan berlebih bisa membuat sulit tidur, sulit fokus, jantung berdebar, atau dorongan untuk menghindar.'),
      poin('04', 'eye', 'Tanda yang perlu diperhatikan: perasaan sedih berkepanjangan, menarik diri dari teman dan pergaulan, serta kehilangan semangat belajar.', 'span2 warn', 'POIN 04 • PERINGATAN DINI'),
      poin('05', 'heart', 'Mencari bantuan dan bercerita adalah tanda keberanian yang terpuji, bukan suatu kelemahan.', 'dark', 'POIN 05 • KESADARAN'),
    ]),
    el('section', { class: 'tips-box' }, [
      tipsHead('Tips untuk Kamu', 'Langkah pembiasaan harian yang menyehatkan batin dan pikiran', '6 Praktik Sederhana', true),
      el('div', { class: 'tips-grid' }, tips.map((t) => el('div', { class: 'tip' }, [el('span', { class: 'ck' }, [ik('check')]), el('span', { text: t })]))),
    ]),
    panelSpiritual({
      arab: 'ٱلَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ ۗ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ',
      arti: '“Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.”', ref: 'QS. Ar-Ra’d ayat 28',
      kartu: [scard('QS. Al-Baqarah ayat 286', '“Allah tidak membebani seseorang melainkan sesuai kesanggupannya.”', null, { besar: true }),
        scard('QS. Al-Insyirah ayat 5–6', '“Maka sesungguhnya bersama kesulitan ada kemudahan, sesungguhnya bersama kesulitan ada kemudahan.”', null, { besar: true })],
      kutip: '“Merasa lelah itu manusiawi. Kamu tidak harus menghadapinya sendirian.”',
    }),
    ...catatanCta('mental'),
  ];
}

// ===== Topik 2: Anti-Bullying =====
function modBullying() {
  const es = (no, ikon, judul, isi, ekstra) => el('article', { class: 'poin essence' }, [
    el('div', { class: 'top' }, [el('span', { class: 'icon-box' }, [ik(ikon)]), `${no}. ${judul}`]), el('p', { text: isi }), ekstra || null]);
  const tipCard = (j, i) => el('div', { class: 'tip block' }, [el('span', { class: 'ck' }, [ik('check')]), el('div', {}, [el('b', { class: 'ttl', text: j }), el('span', { text: i })])]);
  return [
    el('div', { class: 'mod-head' }, [
      el('div', {}, [
        el('span', { class: 'mod-label' }, [ik('users'), 'KATALOG EDUKASI ETIKA & HUBUNGAN SEBAYA']),
        el('h1', { text: 'Anti-Bullying & Budaya Saling Menghormati' }),
        el('p', { class: 'mod-sub', text: 'Sekolah yang aman dimulai dari sikap kita satu sama lain.' }),
        el('p', { class: 'mod-p', text: 'Perundungan bukanlah bagian wajar dari masa pendewasaan. Setiap siswa SMA Muhammadiyah 2 Samarinda berhak atas rasa aman, dihargai identitasnya, serta bebas berpendapat tanpa bayang-bayang ketakutan.' }),
      ]),
      el('div', { class: 'photo-card md' }, [foto('public/img/anti bullying.png', 'Siswa-siswi berkumpul dan berbincang di taman sekolah'), el('span', { class: 'cap' }, [ik('leaf'), 'Hindari Budaya Perundungan, Ciptakan Lingkungan Aman & Ramah'])]),
    ]),
    el('p', { class: 'pillar-lbl', text: 'PILAR PEMAHAMAN' }),
    el('div', { class: 'sub-head', style: 'margin-top:6px' }, [el('h2', { text: 'Edukasi Dasar Perundungan' }), el('span', { class: 'right', text: '5 Esensi Penting yang Wajib Dipahami' })]),
    el('div', { class: 'essence-grid' }, [
      es(1, 'scale', 'Ketimpangan Relasi Kuasa', 'Bullying adalah perilaku menyakiti secara fisik, verbal, atau emosional yang dilakukan berulang dan melibatkan ketimpangan relasi kuasa, bukan sekadar candaan.'),
      es(2, 'shapes', 'Ragam Bentuk Perundungan', 'Bentuk-bentuknya mencakup: verbal (ejekan nama, hinaan fisik), kontak fisik agresif, pengucilan sosial kelompok, perundungan siber (cyberbullying), hingga intimidasi atau pemerasan.',
        el('div', { class: 'mini-chips' }, ['Verbal', 'Fisik', 'Relasional / Pengucilan', 'Siber (Media Sosial)'].map((c) => el('span', { text: c })))),
    ]),
    el('div', { class: 'essence-grid-3' }, [
      es(3, 'heart', 'Dampak yang Nyata', 'Dampaknya sangat nyata: memicu rasa takut berangkat ke sekolah, kecemasan akut, penurunan prestasi akademis, serta penarikan diri dari lingkungan.'),
      es(4, 'smokeoff', 'Trauma Kolektif', 'Pelaku, korban, maupun saksi mata (bystander) semuanya terdampak secara psikologis bila pembiaran terjadi di lingkungan sekolah.'),
      es(5, 'hand', 'Batasan Candaan', 'Candaan yang membuat orang lain merasa tidak nyaman, rendah diri, atau tertekan harus segera dihentikan tanpa dalih keakraban semu.'),
    ]),
    el('section', { class: 'tips-box' }, [
      el('div', { class: 'tips-head' }, [el('span', { class: 'icon-box', style: 'border-radius:50%;background:var(--green-700);color:#fff' }, [ik('bulb')]),
        el('div', {}, [el('span', { class: 'mod-label', text: 'AKSI LANGKAH NYATA' }), el('h2', { text: 'Tips untuk Kamu' })])]),
      el('p', { class: 'tips-intro', text: 'Sikap tegas dan empati setiap siswa dapat memutus rantai perundungan seketika. Berikut panduan perananmu:' }),
      el('div', { class: 'tips-grid' }, [
        tipCard('Bila menjadi korban:', 'Ceritakan segera kepada orang dewasa atau guru SMA Muhammadiyah 2 yang dipercaya, serta simpan bukti tangkapan layar jika terjadi di dunia siber. Kamu berharga dan tidak sendirian.'),
        tipCard('Bila menyaksikan:', 'Jangan ikut tertawa atau membagikan, berikan dukungan moral kepada korban, dan sampaikan laporan rahasia ke portal SAMARA agar segera ditangani guru SMA Muhammadiyah 2.'),
        tipCard('Bila pernah melakukannya:', 'Berhenti sekarang juga, akui kesalahan dengan berani meminta maaf secara tulus, dan mintalah bimbingan guru SMA Muhammadiyah 2 untuk mengelola emosimu dengan sehat.'),
        tipCard('Jaga etika berkomunikasi:', 'Gunakan kata-kata santun dan membangun saat berinteraksi di ruang kelas maupun media sosial. Perbedaan karakter adalah anugerah, bukan bahan cemoohan.'),
      ]),
    ]),
    panelSpiritual({
      arab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا يَسْخَرْ قَوْمٌ مِنْ قَوْمٍ عَسَىٰ أَنْ يَكُونُوا خَيْرًا مِنْهُمْ',
      arti: '“Wahai orang-orang yang beriman! Janganlah suatu kaum mengolok-olok kaum yang lain, boleh jadi mereka yang diperolok-olok lebih baik dari mereka...”', ref: 'QS. Al-Hujurat ayat 11',
      kartu: [scard('SABDA RASULULLAH SAW', '“Seorang Muslim adalah orang yang membuat orang lain selamat dari kejahatan lisan dan tangannya.”', '(HR. Bukhari dan Muslim)'),
        el('div', { class: 'pill-quote leaf' }, [el('span', { class: 'lf' }, [ik('leaf')]), '“Menjaga lisan dan tangan adalah bagian dari menjaga kehormatan sesama.”'])],
    }),
    ...catatanCta('bullying'),
  ];
}

// ===== Topik 3: Bahaya Rokok & Vape =====
function modRokok() {
  const fakta = [
    ['flask', 'Zat Kimia Karsinogenik', 'Rokok konvensional mengandung nikotin kuat yang memicu ketergantungan cepat, serta tar dan ratusan zat kimia karsinogenik berbahaya.'],
    ['wind', 'Penyakit Paru & Jantung', 'Konsumsi rokok dan nikotin meningkatkan risiko fatal gangguan saluran pernapasan, kerusakan paru-paru kronis, dan penyakit kardiovaskular sejak usia muda.'],
    ['smokeoff', 'Mitos Keamanan Vape', 'Rokok elektrik (vape) bukanlah alternatif aman. Cairan vape mengandung senyawa nikotin terkonsentrasi, logam berat aerosol, dan zat adiktif yang merusak jaringan paru.'],
    ['users', 'Bahaya Perokok Pasif', 'Paparan asap rokok maupun aerosol vape membahayakan orang di sekitarmu sebagai perokok pasif (secondhand dan thirdhand smoke).'],
    ['wallet', 'Kerugian Finansial & Akademik', 'Kebiasaan merokok menguras uang saku pelajar, menurunkan stamina fisik berolahraga, dan mengganggu fokus konsentrasi belajar di kelas.'],
    ['squarecheck', 'Zona Integritas Sekolah (KTR)', 'Kawasan sekolah SMA Muhammadiyah 2 Samarinda adalah zona integritas tanpa rokok (KTR) yang wajib dijaga kebersihannya oleh seluruh warga sekolah.'],
  ];
  const tips = [
    [['b', 'Tolak ajakan merokok atau vape dengan singkat, tegas, dan tenang'], ': contoh ucapan santun namun kuat seperti ', ['i', '“Maaf, aku tidak ikut”'], ' atau ', ['i', '“Aku memilih jaga stamina untuk futsal”.']],
    [['b', 'Alihkan waktu luang ke kegiatan positif'], ': kumpul bersama teman sebaya melalui ekstrakurikuler olahraga, seni, kelompok robotik, atau diskusi ilmiah yang membangun energi optimis.'],
    [['b', 'Kenali pemicu kebiasaan buruk'], ': waspadai situasi seperti tekanan kelompok sebaya (', ['i', 'peer pressure'], '), rasa ingin diakui, atau dorongan rasa penasaran sesaat.'],
    [['b', 'Ceritakan kepada guru SMA Muhammadiyah 2 tanpa rasa takut'], ': jika kamu atau teman terdekat sedang berjuang untuk melepaskan diri dari ketergantungan nikotin, para guru hadir untuk merangkul dan mencari jalan keluar, bukan memberi hukuman.'],
    [['b', 'Dukung rekanmu yang bertekad berhenti'], ': berikan apresiasi pada langkah kecil temanmu dengan pendekatan suportif, hindari mencela atau menghakimi ketika mereka mengalami masa sulit.'],
  ];
  return [
    el('div', { class: 'head-card' }, [
      el('div', {}, [el('span', { class: 'mod-label' }, [ik('checkcircle'), 'MODUL PANDUAN SISWA REMAJA SEHAT']), el('h1', { text: 'Bahaya Rokok & Vape Bagi Remaja' }), el('p', { text: 'Mengenali risiko adalah langkah pertama untuk menjaga diri.' })]),
      el('div', { class: 'status-card' }, [el('span', { class: 'icon-box' }, [ik('heart')]), el('div', {}, [el('small', { text: 'Status Sekolah' }), el('b', { text: 'KTR Bebas Nikotin' })])]),
    ]),
    el('div', { class: 'two-split' }, [
      el('div', { class: 'photo-card tall' }, [foto('public/img/no rokok.png', 'Siswi tersenyum membawa buku di taman sekolah'),
        el('div', { class: 'cap2' }, [el('small', { text: 'SAY NO TO CIGARETTE' }), el('b', { text: 'Generasi Cerdas Menjaga Stamina & Fokus Belajar' })])]),
      el('div', { class: 'clinic' }, [
        el('span', { class: 'mod-label', text: 'KENYATAAN KLINIS' }), el('h3', { text: 'Masa Perkembangan Otak Hingga Usia 25 Tahun' }),
        el('p', { text: 'Nikotin pada rokok maupun cairan vape secara langsung mengubah struktur sirkuit dopamin otak remaja. Hal ini memperparah gangguan kecemasan, mengurangi daya ingat jangka pendek, serta membentuk ketergantungan seumur hidup yang sulit dihentikan tanpa pendampingan intensif.' }),
        el('ul', {}, ['100% Bebas Asap', 'Cegah Karsinogen', 'Proteksi Teman Sebaya'].map((t) => el('li', { text: t }))),
      ]),
    ]),
    el('div', { class: 'sub-head' }, [el('span', { class: 'ic-circle' }, [ik('bulb')]), el('div', {}, [el('h2', { text: 'Edukasi Dasar' }), el('small', { text: 'Fakta esensial yang perlu dipahami setiap siswa SMA Muhammadiyah 2 Samarinda.' })])]),
    el('div', { class: 'fact-grid' }, fakta.map(([i, j, t]) => el('article', { class: 'fact' }, [el('h3', {}, [el('span', { class: 'icon-box' }, [ik(i)]), j]), el('p', { text: t })]))),
    el('section', { class: 'tips-box' }, [
      tipsHead('Tips untuk Kamu', 'Langkah taktis dan percaya diri menghadapi ajakan atau tekanan sebaya.', null, false),
      el('div', { class: 'tips-list' }, tips.map((t) => el('div', { class: 'tip row' }, [el('span', { class: 'ck' }, [ik('check')]), el('span', {}, rich(t))]))),
    ]),
    panelSpiritual({
      arab: 'وَلَا تُلْقُوا بِأَيْدِيكُمْ إِلَى التَّهْلُكَةِ ۛ وَأَحْسِنُوا ۛ إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ',
      arti: '“Dan janganlah kamu menjatuhkan dirimu sendiri ke dalam kebinasaan, dan berbuat baiklah. Sungguh, Allah menyukai orang-orang yang berbuat baik.”', ref: 'QS. Al-Baqarah ayat 195',
      kartu: [scard('HADIS RASULULLAH SAW', '“Tidak boleh membahayakan diri sendiri dan tidak boleh membahayakan orang lain.”', 'HR. Ibnu Majah dan Ahmad'),
        scard('QS. AL-A’RAF AYAT 157', '“...Menghalalkan bagi mereka segala yang baik dan mengharamkan bagi mereka segala yang buruk...”', 'Pedoman Kemaslahatan Jiwa & Raga')],
      pil: el('span', { class: 'pill-big', text: '“Tubuh adalah amanah yang perlu kita jaga.”' }),
    }),
    ...catatanCta('rokok'),
  ];
}

// ===== Daftar topik =====
const TOPIK = [
  { id: 'kesehatan-mental', judul: 'Kesehatan Mental & Beban Pikiran', ikon: 'mind', ringkas: 'Mengenali stres dan kecemasan, serta cara merawat diri.', isi: modKesehatan },
  { id: 'anti-bullying', judul: 'Anti-Bullying', ikon: 'shield', ringkas: 'Memahami perundungan, dampaknya, dan langkah yang bisa diambil.', isi: modBullying },
  { id: 'rokok-vape', judul: 'Bahaya Rokok & Vape', ikon: 'smokeoff', ringkas: 'Risiko kesehatan dan cara menolak ajakan merokok.', isi: modRokok },
];

const gridKartu = document.getElementById('topic-grid');
const panel = document.getElementById('info-panel');
const hitung = document.getElementById('topic-count');
const utama = document.getElementById('info-main');
let aktif = null; // null = keadaan awal (belum ada topik dipilih)

function renderKartu() {
  gridKartu.replaceChildren(...TOPIK.map((t) => {
    const on = t.id === aktif;
    const btn = el('button', { type: 'button', class: 'btn btn-cream', 'aria-pressed': String(on) }, on ? ['Sedang Dibaca', ik('checkcheck')] : ['Lihat Topik Ini', ik('arrow')]);
    if (on) btn.disabled = true; else btn.addEventListener('click', () => pilih(t.id, true, true));
    return el('article', { class: 'topic-card' + (on ? ' active' : '') }, [
      el('span', { class: 'tag' }, [ik('check'), 'TOPIK AKTIF']),
      el('div', { class: 'head' }, [el('span', { class: 'icon-box' }, [ik(t.ikon)]), el('h3', { text: t.judul })]),
      el('p', { text: t.ringkas }), btn,
    ]);
  }));
}

// Keadaan awal: semua kartu non-aktif, tanpa panel konten.
function tampilAwal() {
  aktif = null;
  hitung.textContent = `Topik ${TOPIK.length} dari ${TOPIK.length}`;
  utama.classList.add('is-awal');
  panel.classList.remove('fade-in');
  panel.replaceChildren();
  panel.hidden = true;
  renderKartu();
}

// ubahHash=true -> tambahkan entri riwayat agar tombol Back/Forward bekerja.
function pilih(id, gulir, ubahHash) {
  const idx = TOPIK.findIndex((t) => t.id === id);
  if (idx < 0) { tampilAwal(); return; }
  aktif = id;
  hitung.textContent = `Topik ${idx + 1} dari ${TOPIK.length}`;
  utama.classList.remove('is-awal');
  renderKartu();
  panel.replaceChildren(...TOPIK[idx].isi());
  panel.hidden = false;
  panel.classList.remove('fade-in'); void panel.offsetWidth; panel.classList.add('fade-in');
  if (ubahHash && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  if (gulir) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Sinkronkan tampilan dengan hash URL (dipakai saat buka halaman, Back/Forward).
function sinkron(gulir) {
  const h = location.hash.slice(1);
  if (TOPIK.some((t) => t.id === h)) { if (h !== aktif) pilih(h, gulir, false); }
  else if (aktif !== null || !gridKartu.hasChildNodes()) tampilAwal();
}

window.addEventListener('hashchange', () => sinkron(true));
window.addEventListener('popstate', () => sinkron(true));
sinkron(false);
