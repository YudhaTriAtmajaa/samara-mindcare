// Edge Function: verifikasi Google reCAPTCHA v2 lalu simpan laporan.
// Tidak membaca/menyimpan IP atau perangkat siswa. Secret reCAPTCHA hanya ada di sini.
// WAJIB di-deploy dengan JWT dimatikan (lihat supabase/config.toml): kunci "sb_publishable_..."
// bukan JWT, sehingga gateway menolaknya (401) bila "Verify JWT" aktif. Perlindungan fungsi ini = reCAPTCHA.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ALLOWED_ORIGIN boleh berisi beberapa origin dipisah koma, mis.
// "https://samara.netlify.app,https://samara.sch.id". Garis miring di akhir diabaikan.
const ALLOWED = (Deno.env.get('ALLOWED_ORIGIN') ?? '*').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
function corsFor(req: Request) {
  const origin = (req.headers.get('origin') ?? '').replace(/\/+$/, '');
  const ok = ALLOWED.includes('*') || ALLOWED.includes(origin);
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes('*') ? '*' : ok ? origin : ALLOWED[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const t = (v: unknown, n: number) => (v == null || v === '' ? null : String(v).trim().slice(0, n));

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let b: any;
  try { b = await req.json(); } catch { return json({ kode: 'data', error: 'Permintaan tidak valid.' }, 400); }

  // 1) Validasi data dulu (murah), sebelum memakai token reCAPTCHA yang hanya bisa dipakai sekali
  const KAT = ['mental', 'bullying', 'rokok'];
  const PEL = ['diri_sendiri', 'siswa_lain', 'disaksikan'];
  const isi = t(b.isi, 1200);
  const namaTerdampak = t(b.nama_terdampak, 200);
  const namaPelaku = t(b.nama_pelaku, 200);
  if (!KAT.includes(b.kategori) || !PEL.includes(b.pelapor) || !isi || !t(b.bentuk, 200)) return json({ kode: 'data', error: 'Data tidak valid.' }, 400);
  // Mental & bullying wajib "nama siswa yang terdampak"; rokok & vape wajib "nama siswa sebagai pelaku"
  if (b.kategori === 'rokok' ? !namaPelaku : !namaTerdampak) return json({ kode: 'data', error: 'Nama siswa wajib diisi.' }, 400);

  // 2) Verifikasi reCAPTCHA di server (tanpa meneruskan IP). Token kosong/tidak valid/kedaluwarsa => ditolak, tidak ada yang disimpan.
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY');
  if (!secret) { console.error('RECAPTCHA_SECRET_KEY belum diatur: jalankan `supabase secrets set RECAPTCHA_SECRET_KEY=...`'); return json({ kode: 'konfigurasi', error: 'Konfigurasi server belum lengkap.' }, 500); }
  const token = typeof b.token === 'string' ? b.token.trim() : '';
  if (!token || token.length > 5000) return json({ kode: 'captcha', error: 'Verifikasi gagal.' }, 400);
  let v: any;
  try {
    const form = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    v = await res.json();
  } catch (e) { console.error('Gagal menghubungi reCAPTCHA:', e); return json({ kode: 'captcha_jaringan', error: 'Verifikasi tidak dapat dihubungi.' }, 502); }
  if (!v || v.success !== true) { console.error('reCAPTCHA ditolak:', JSON.stringify(v?.['error-codes'] ?? [])); return json({ kode: 'captcha', error: 'Verifikasi gagal.' }, 400); }

  // 3) Simpan
  const gambar = Array.isArray(b.gambar) ? b.gambar.slice(0, 3).filter((p: unknown) => typeof p === 'string' && /^[0-9a-f-]{36}\.(webp|jpg)$/.test(p)) : [];
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.from('laporan').insert({
    kategori_isu: b.kategori, siswa_yang_berkaitan: b.pelapor, 'bentuk keluhan / kondisi utama yang dirasakan': t(b.bentuk, 200),
    nama_terdampak: b.kategori === 'rokok' ? null : namaTerdampak,
    nama_pelaku: b.kategori === 'rokok' ? namaPelaku : null,
    waktu: t(b.waktu, 200), lokasi: t(b.lokasi, 200),
    perkiraan_durasi_yang_dirasakan: t(b.durasi, 200), 'Situasi / Kondisi Pemicu (khusus Kesehatan Mental)': t(b.pemicu, 200),
    isi, gambar,
  });
  if (error) {
    console.error('Gagal menyimpan laporan:', error.message);
    const batas = /terlalu banyak kiriman/i.test(error.message);
    return json({ kode: batas ? 'batas' : 'simpan', error: 'Gagal menyimpan.' }, batas ? 429 : 500);
  }
  return json({ ok: true });
});
