// Pemetaan nama kolom tabel `laporan` di Supabase (nama baru) <-> nama internal yang dipakai kode UI.
// Jika nama kolom di Supabase berubah lagi, cukup ubah di file ini.
export const C = {
  kategori: 'kategori_isu',
  pelapor: 'siswa_yang_berkaitan',
  bentuk: 'bentuk keluhan / kondisi utama yang dirasakan',
  pemicu: 'Situasi / Kondisi Pemicu (khusus Kesehatan Mental)',
  durasi: 'perkiraan_durasi_yang_dirasakan',
  tanggal: 'tanggal_masuk',
};

// Nama kolom yang mengandung spasi / tanda baca harus diberi tanda kutip ganda di query PostgREST.
export const q = (nama) => (/^[a-z_][a-z0-9_]*$/.test(nama) ? nama : `"${nama}"`);

// Ubah baris dari database menjadi bentuk internal (kategori, pelapor, bentuk, pemicu, durasi, dibuat_pada).
export const norm = (r) => (r ? { ...r, kategori: r[C.kategori], pelapor: r[C.pelapor], bentuk: r[C.bentuk], pemicu: r[C.pemicu], durasi: r[C.durasi], dibuat_pada: r[C.tanggal] } : r);
export const normAll = (rows) => (rows || []).map(norm);
