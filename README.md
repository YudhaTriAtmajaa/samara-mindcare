# SAMARA MindCare

Platform pelaporan siswa SMA Muhammadiyah 2 Samarinda.
Stack: Vite (multi-halaman) + JavaScript biasa, Supabase, Google reCAPTCHA v2 (form pelaporan), Cloudflare Turnstile (login admin), Chart.js.

## Menjalankan lokal
```bash
npm install
cp .env.example .env   # isi nilai publik
npm run dev
npm run build
```

## Foto
Letakkan dua foto di folder `public/`: `foto-hero.jpg` (dua siswi) dan `foto-guru.jpg` (siswi dengan guru SMA Muhammadiyah 2).
Tanpa foto, halaman tetap tampil dengan latar gradien.

## Setup Supabase
1. Buat proyek di supabase.com. Salin **Project URL** dan **anon key** ke `.env`.
2. SQL Editor: jalankan `supabase/schema.sql`, lalu `supabase/policies.sql`. (Proyek lama: cukup jalankan `supabase/migrasi-revisi-nama-siswa.sql`.)
3. Authentication → Sign In / Providers: matikan pendaftaran mandiri (Sign ups → disable). MFA TOTP tidak lagi dipakai (boleh dimatikan).
   Authentication → Attack Protection → **Enable CAPTCHA protection** → provider **Cloudflare Turnstile** → isi **Secret key** Turnstile → Save.
   Authentication → Rate Limits: turunkan *Rate limit for sign-ups and sign-ins* (mis. 10 per 5 menit per IP).
   **Proyek lama:** jalankan ulang `supabase/policies.sql` (syarat `aal2` pada kebijakan dihapus; tanpa ini panel admin tidak akan menampilkan data).
4. Petugas pertama: buat user di Authentication → Users (centang auto-confirm), lalu jalankan:
   ```sql
   insert into public.petugas (user_id, nama, email)
   select id, 'Nama Admin', email from auth.users where email = 'admin@contoh.sch.id';
   ```
   Login memakai email + kata sandi + Turnstile. Petugas berikutnya ditambah dari halaman **Petugas**.
5. Edge Functions (Supabase CLI):
   ```bash
   supabase link --project-ref <ref>
   supabase secrets set RECAPTCHA_SECRET_KEY=<secret> ALLOWED_ORIGIN=https://domain-anda
   supabase functions deploy kirim-laporan --no-verify-jwt   # JWT harus mati: kunci sb_publishable_ bukan JWT (lihat supabase/config.toml)
   supabase functions deploy kelola-petugas
   ```
   `ALLOWED_ORIGIN` boleh beberapa origin dipisah koma, tanpa garis miring di akhir.
   `SUPABASE_SERVICE_ROLE_KEY` tersedia otomatis di fungsi dan **tidak boleh** ditaruh di front-end atau `.env`.

## Google reCAPTCHA v2 (form pelaporan anonim)
1. Buka google.com/recaptcha/admin → **Create** → tipe **reCAPTCHA v2 → "Invisible reCAPTCHA badge"** (bukan Checkbox / v3 / Enterprise).
2. Isi domain (untuk lokal tambahkan `localhost`; untuk akses lewat IP LAN tambahkan IP tersebut).
3. **Site key** → `VITE_RECAPTCHA_SITE_KEY` (front-end). **Secret key** → secret Edge Function `RECAPTCHA_SECRET_KEY` (tidak pernah ke front-end).
Token diverifikasi di Edge Function `kirim-laporan` ke `google.com/recaptcha/api/siteverify`; bila gagal/kedaluwarsa laporan tidak disimpan.
Pembatasan frekuensi: jeda 60 detik di browser dan batas global 30 kiriman/menit di database (tanpa menyimpan IP).

## Cloudflare Turnstile (login admin)
1. Dashboard Cloudflare → Turnstile → **Add widget** → isi domain admin (mode Managed).
2. **Site key** → `VITE_TURNSTILE_SITE_KEY` (front-end). **Secret key** → hanya di Supabase: Authentication → Attack Protection → CAPTCHA (langkah 3 Setup Supabase). Secret tidak pernah ada di front-end atau `.env` Vite.
3. Login memanggil `signInWithPassword` dengan `captchaToken`; Supabase Auth memverifikasi token ke Cloudflare di server. Token kosong/gagal/kedaluwarsa → login ditolak. Pembatasan percobaan: kunci 5 menit setelah 5 kegagalan di browser + rate limit server Supabase.

## Kunci uji (hanya untuk pengujian, jangan dipakai di production)
- reCAPTCHA v2 selalu lolos (dari Google): sitekey `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`, secret `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`.
- Turnstile: sitekey `1x00000000000000000000AA` (selalu lolos), `2x00000000000000000000AB` (selalu gagal); secret uji `1x0000000000000000000000000000000AA` / `2x0000000000000000000000000000000AA`.

## Deploy
- **Netlify**: hubungkan repo, build `npm run build`, publish `dist`. Isi variabel `VITE_*` di Site settings. `netlify.toml` sudah berisi header keamanan.
- Jika memakai domain Supabase khusus, sesuaikan `connect-src` / `img-src` pada CSP di `netlify.toml`.

## Catatan keamanan
- Tidak ada kolom NIS/IP/perangkat pelapor. Nama siswa terdampak/pelaku hanya diisi pelapor pada formulir dan dibaca petugas aktif yang sudah login (email + kata sandi + Turnstile). Gambar dikompres ulang di browser (EXIF hilang) dan diberi nama acak.
- Data pengguna ditampilkan dengan `textContent` (lihat `src/js/aman.js`), tanpa `innerHTML`.
- Gambar admin dibuka lewat signed URL 5 menit; bucket privat.
- Unggahan gambar terjadi sebelum reCAPTCHA diverifikasi server; berkas yatim dapat dibersihkan berkala dari bucket.
